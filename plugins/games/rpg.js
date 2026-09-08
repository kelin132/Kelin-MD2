// plugins/games/rpg.js
// RPG — solo text dungeon crawler with canvas cards.
// v2: difficulty tiers, elite enemies, equipment, class skills, merchant/event
// rooms, and rebirth/prestige for long-term replay depth.

import {
  CLASSES,
  DIFFICULTIES,
  ROOMS_PER_RUN,
  REBIRTH_LEVEL,
  getCharacter,
  createCharacter,
  effectiveStats,
  startRun,
  getRun,
  abandonRun,
  advanceRoom,
  attack,
  useSkill,
  flee,
  usePotion,
  equipItem,
  resolveEvent,
  buyMerchantOffer,
  rebirth,
  topCharacters,
} from "../../lib/dungeonCrawler.mjs";
import {
  generateCharacterCard,
  generateRoomCard,
  generateBattleCard,
  generateResultCard,
  generateLeaderboardCard,
} from "../../lib/dungeonCanvas.mjs";

function displayName(msg, jid) {
  return msg.pushName || jid.split("@")[0];
}

async function sendCharacterCard(sock, jid, msg, character, caption = "") {
  const { atk, def } = effectiveStats(character);
  const buf = await generateCharacterCard({ character, effAtk: atk, effDef: def });
  await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
}

async function sendRoomCard(sock, jid, msg, { type, room, detail, difficulty }) {
  const buf = await generateRoomCard({ type, roomNumber: room, totalRooms: ROOMS_PER_RUN, detail, difficulty });
  let caption;
  if (type === "treasure") caption = `💰 *Treasure Room* (found ${detail})\n\n• *.rpg next* to keep going`;
  else if (type === "rest") caption = `🔥 *Resting Point* (healed ${detail} HP)\n\n• *.rpg next* to keep going`;
  else if (type === "trap") caption = `🕳 *Trap!* (took ${detail} damage)\n\n• *.rpg next* to keep going`;
  else caption = `🚪 Room ${room}/${ROOMS_PER_RUN}`;
  await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
}

async function sendBattleCard(sock, jid, character, run, lastLine) {
  const { atk, def } = effectiveStats(character);
  const enemy = run.enemy;
  const cls = CLASSES[character.class];
  const buf = await generateBattleCard({ character, enemy, lastLine, effAtk: atk, effDef: def, skillAvailable: !run.skillUsed });
  await sock.sendMessage(jid, {
    image: buf,
    caption:
      `⚔️ *${enemy.name}* (${enemy.hp}/${enemy.maxHp} HP) blocks the way!\n\n` +
      `• *.rpg attack* (basic strike)\n` +
      `• *.rpg skill* (${cls.skillName} — ${cls.skillDesc}${run.skillUsed ? ", *used this fight*" : ""})\n` +
      `• *.rpg flee* (50% chance to escape)\n` +
      `• *.rpg heal* (use a potion mid-fight)`,
  });
}

async function sendRunResult(sock, jid, msg, character, result) {
  const buf = await generateResultCard({ success: result.success, character, roomsCleared: result.roomsCleared, meta: result });
  const lines = [];
  if (result.xpGainedTotal) lines.push(`+${result.xpGainedTotal} XP`);
  if (result.goldGainedTotal) lines.push(`+$${result.goldGainedTotal} gold`);
  if (result.goldLost) lines.push(`-$${result.goldLost} gold lost`);
  await sock.sendMessage(jid, {
    image: buf,
    caption:
      (result.success ? `🏆 *Dungeon cleared!* (all ${ROOMS_PER_RUN} rooms)` : `💀 *Run over* (reached room ${result.roomsCleared})`) +
      (lines.length ? `\n${lines.join("   •   ")}` : "") +
      `\n\n• *.rpg enter* to try again\n• *.rpg profile* to see your sheet`,
  }, { quoted: msg });
}

export default {
  name: "rpg",
  aliases: ["dungeon", "dg"],
  description: "Solo text RPG dungeon crawler — create a hero, explore, fight, loot, and level up",
  category: "games",
  usage:
    ".rpg create <class> · .rpg enter [difficulty] · .rpg next · .rpg attack · .rpg skill · .rpg flee · .rpg heal · " +
    ".rpg equip <item> · .rpg inventory · .rpg buy · .rpg choice <1|2> · .rpg rebirth · .rpg profile · .rpg leaderboard",
  cooldown: 2,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();
    const name = displayName(msg, sender);

    // ── help ─────────────────────────────────────────────────────────────
    if (sub === "help") {
      return sock.sendMessage(jid, {
        text:
          `🏰 *RPG* (solo dungeon crawler)\n\n` +
          `*Setup*\n` +
          `• *.rpg create <warrior|mage|rogue>*\n` +
          `• *.rpg enter [easy|normal|hard|nightmare]* (${ROOMS_PER_RUN} rooms, boss at the end)\n\n` +
          `*During a run*\n` +
          `• *.rpg next* — advance to the next room\n` +
          `• *.rpg attack* / *.rpg skill* / *.rpg flee* / *.rpg heal* — in battle\n` +
          `• *.rpg buy* — purchase a merchant's offer\n` +
          `• *.rpg choice <1|2>* — resolve an event room\n` +
          `• *.rpg status* / *.rpg abandon*\n\n` +
          `*Character*\n` +
          `• *.rpg profile* — character sheet\n` +
          `• *.rpg inventory* — your bag, *.rpg equip <item name>* to gear up\n` +
          `• *.rpg rebirth* — reset to Lv.1 for a permanent +5% stat bonus (needs Lv.${REBIRTH_LEVEL}+)\n` +
          `• *.rpg leaderboard*`,
      }, { quoted: msg });
    }

    // ── create ───────────────────────────────────────────────────────────
    if (sub === "create") {
      const classKey = (args[1] || "").toLowerCase();
      if (!CLASSES[classKey]) {
        return sock.sendMessage(jid, {
          text: `Usage: *.rpg create <class>*\n\nClasses:\n${Object.entries(CLASSES).map(([k, c]) => `• *${k}* — ${c.label} (${c.maxHp} HP, ${c.atk} ATK, ${c.def} DEF) — skill: ${c.skillName} (${c.skillDesc})`).join("\n")}`,
        }, { quoted: msg });
      }
      const res = createCharacter(sender, name, classKey);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ You already have a character! Use *.rpg profile* to view it." }, { quoted: msg });
      return sendCharacterCard(sock, jid, msg, res.character, `🎉 *${name}* the ${CLASSES[classKey].label} was created!\n\n• *.rpg enter* to start your first dungeon run.`);
    }

    // ── profile ──────────────────────────────────────────────────────────
    if (sub === "profile" || sub === "sheet") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet — create one with *.rpg create <warrior|mage|rogue>*" }, { quoted: msg });
      return sendCharacterCard(sock, jid, msg, character);
    }

    // ── inventory / equip ────────────────────────────────────────────────
    if (sub === "inventory" || sub === "bag" || sub === "inv") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet." }, { quoted: msg });
      if (!character.inventory.length) {
        return sock.sendMessage(jid, { text: "🎒 Your bag is empty. Find gear in treasure rooms or buy from merchants." }, { quoted: msg });
      }
      const lines = character.inventory.map((i) => `• ${i.slot === "weapon" ? "⚔️" : "🛡"} *${i.name}* (${i.rarity}, +${i.bonus} ${i.slot === "weapon" ? "ATK" : "DEF"})`);
      return sock.sendMessage(jid, {
        text: `🎒 *Your Bag*\n\n${lines.join("\n")}\n\nEquipped: ${character.weapon ? character.weapon.name : "(no weapon)"} / ${character.armor ? character.armor.name : "(no armor)"}\n\n• *.rpg equip <item name>*`,
      }, { quoted: msg });
    }

    if (sub === "equip") {
      const itemName = args.slice(1).join(" ");
      if (!itemName) return sock.sendMessage(jid, { text: "Usage: *.rpg equip <item name>* — see *.rpg inventory* for what you have." }, { quoted: msg });
      const res = equipItem(sender, itemName);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Item not found in your bag. Check *.rpg inventory*." }, { quoted: msg });
      return sock.sendMessage(jid, {
        text: `✅ Equipped *${res.equipped.name}* (+${res.equipped.bonus} ${res.equipped.slot === "weapon" ? "ATK" : "DEF"})${res.replaced ? `\n📦 *${res.replaced.name}* was moved back to your bag.` : ""}`,
      }, { quoted: msg });
    }

    // ── rebirth ──────────────────────────────────────────────────────────
    if (sub === "rebirth" || sub === "prestige") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet." }, { quoted: msg });
      if (getRun(sender)) return sock.sendMessage(jid, { text: "❌ Finish or abandon your current run before rebirthing." }, { quoted: msg });
      const res = rebirth(sender);
      if (!res.ok) {
        return sock.sendMessage(jid, { text: `❌ You need to be Level ${REBIRTH_LEVEL}+ to rebirth (currently Lv.${character.level}).` }, { quoted: msg });
      }
      return sendCharacterCard(sock, jid, msg, res.character, `⭐ *Rebirth complete!* You're now Prestige x${res.character.prestige} — reset to Lv.1 but all stats are permanently +${res.character.prestige * 5}% stronger.`);
    }

    // ── leaderboard ──────────────────────────────────────────────────────
    if (sub === "leaderboard" || sub === "top") {
      const entries = topCharacters(10);
      if (!entries.length) return sock.sendMessage(jid, { text: "📊 No heroes yet — be the first with *.rpg create*!" }, { quoted: msg });
      const buf = await generateLeaderboardCard({ entries });
      return sock.sendMessage(jid, { image: buf, caption: "🏰 *RPG Leaderboard* (all groups combined)" });
    }

    // ── enter ────────────────────────────────────────────────────────────
    if (sub === "enter" || sub === "start") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet — create one with *.rpg create <warrior|mage|rogue>*" }, { quoted: msg });

      const diffKey = (args[1] || "normal").toLowerCase();
      if (!DIFFICULTIES[diffKey]) {
        return sock.sendMessage(jid, { text: `❌ Unknown difficulty. Choose: ${Object.keys(DIFFICULTIES).join(", ")}` }, { quoted: msg });
      }

      const res = startRun(sender, diffKey);
      if (!res.ok) {
        if (res.reason === "already-running") return sock.sendMessage(jid, { text: "⚠️ You already have a run in progress — try *.rpg status*" }, { quoted: msg });
        return sock.sendMessage(jid, { text: "❌ Can't start a run right now." }, { quoted: msg });
      }
      await sock.sendMessage(jid, {
        text: `🕯 *${name}* steps into the dungeon on *${DIFFICULTIES[diffKey].label}* difficulty... (${ROOMS_PER_RUN} rooms ahead, a boss waits at the end)\n\n• *.rpg next* to open the first door.`,
      }, { quoted: msg });
      return;
    }

    // ── next / continue ──────────────────────────────────────────────────
    if (sub === "next" || sub === "continue") {
      const run = getRun(sender);
      if (!run) return sock.sendMessage(jid, { text: "❌ No active run — start one with *.rpg enter*" }, { quoted: msg });
      if (run.status === "battle") return sock.sendMessage(jid, { text: "⚔️ You're in a battle — use *.rpg attack*, *.rpg skill*, or *.rpg flee*." }, { quoted: msg });

      const res = advanceRoom(sender);
      if (!res.ok) {
        if (res.reason === "pending-event") return sock.sendMessage(jid, { text: "❓ Resolve the event first with *.rpg choice 1* or *.rpg choice 2*." }, { quoted: msg });
        return sock.sendMessage(jid, { text: "❌ Can't advance right now." }, { quoted: msg });
      }

      if (res.type === "enemy" || res.type === "boss") {
        const character = getCharacter(sender);
        const freshRun = getRun(sender);
        return sendBattleCard(sock, jid, character, freshRun);
      }
      if (res.ended) {
        const character = getCharacter(sender);
        return sendRunResult(sock, jid, msg, character, res);
      }
      if (res.type === "merchant") {
        const o = res.offer;
        const buf = await generateRoomCard({ type: "merchant", roomNumber: res.room, totalRooms: ROOMS_PER_RUN, detail: `${o.label} — $${o.price}` });
        return sock.sendMessage(jid, {
          image: buf,
          caption: `🛒 *Traveling Merchant*\n\n${o.label}\n💰 Price: *$${o.price}*\n\n• *.rpg buy* to purchase\n• *.rpg next* to walk away`,
        }, { quoted: msg });
      }
      if (res.type === "event") {
        const e = res.event;
        const buf = await generateRoomCard({ type: "event", roomNumber: res.room, totalRooms: ROOMS_PER_RUN, detail: e.text });
        return sock.sendMessage(jid, {
          image: buf,
          caption: `❓ *${e.text}*\n\n1️⃣ ${e.options[0].label}\n2️⃣ ${e.options[1].label}\n\n• *.rpg choice 1* or *.rpg choice 2*`,
        }, { quoted: msg });
      }

      let detail = "";
      if (res.type === "treasure") detail = res.loot.label;
      if (res.type === "rest") detail = `+${res.healed}`;
      if (res.type === "trap") detail = `-${res.dmg}`;
      return sendRoomCard(sock, jid, msg, { type: res.type, room: res.room, detail });
    }

    // ── buy (merchant) ──────────────────────────────────────────────────
    if (sub === "buy") {
      const res = buyMerchantOffer(sender);
      if (!res.ok) {
        const map = { "no-offer": "❌ No merchant offer active right now.", "too-poor": "❌ You don't have enough gold for that." };
        return sock.sendMessage(jid, { text: map[res.reason] || "❌ Can't buy right now." }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: `✅ Bought *${res.offer.label}* for $${res.offer.price}!\n\n• *.rpg next* to continue` }, { quoted: msg });
    }

    // ── choice (event) ──────────────────────────────────────────────────
    if (sub === "choice") {
      const n = parseInt(args[1], 10);
      if (n !== 1 && n !== 2) return sock.sendMessage(jid, { text: "Usage: *.rpg choice 1* or *.rpg choice 2*" }, { quoted: msg });
      const res = resolveEvent(sender, n - 1);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ No event to resolve right now." }, { quoted: msg });
      return sock.sendMessage(jid, { text: `${res.text}\n\n• *.rpg next* to continue` }, { quoted: msg });
    }

    // ── attack ───────────────────────────────────────────────────────────
    if (sub === "attack" || sub === "atk") {
      const run = getRun(sender);
      if (!run || run.status !== "battle") return sock.sendMessage(jid, { text: "❌ You're not in a battle. Use *.rpg next* to explore." }, { quoted: msg });

      const res = attack(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Can't attack right now." }, { quoted: msg });
      const character = getCharacter(sender);

      if (res.enemyDefeated) {
        const lines = [`💥 You defeated the enemy! +${res.xpGained} XP, +$${res.goldGained} gold`];
        if (res.levelsGained?.length) lines.push(`🌟 Level up! Now Lv.${res.levelsGained.at(-1)}`);
        if (res.ended) return sendRunResult(sock, jid, msg, character, res);
        await sock.sendMessage(jid, { text: lines.join("\n") + `\n\n• *.rpg next* to continue` }, { quoted: msg });
        return;
      }
      if (res.ended) return sendRunResult(sock, jid, msg, character, res);

      const critNote = res.playerHit.isCrit ? " 💥 CRIT!" : "";
      const lastLine = `You hit for ${res.playerHit.dmg}${critNote} — enemy hits back for ${res.enemyHit.dmg}`;
      return sendBattleCard(sock, jid, character, run, lastLine);
    }

    // ── skill ────────────────────────────────────────────────────────────
    if (sub === "skill" || sub === "ability") {
      const run = getRun(sender);
      if (!run || run.status !== "battle") return sock.sendMessage(jid, { text: "❌ You're not in a battle." }, { quoted: msg });

      const res = useSkill(sender);
      if (!res.ok) {
        const map = { "already-used": "❌ You've already used your skill this battle." };
        return sock.sendMessage(jid, { text: map[res.reason] || "❌ Can't use your skill right now." }, { quoted: msg });
      }
      const character = getCharacter(sender);
      const cls = CLASSES[character.class];

      if (res.enemyDefeated) {
        const lines = [`✨ *${cls.skillName}!* You struck for ${res.playerHit.dmg} and defeated the enemy! +${res.xpGained} XP, +$${res.goldGained} gold`];
        if (res.healed) lines.push(`❤️ Healed ${res.healed} HP`);
        if (res.levelsGained?.length) lines.push(`🌟 Level up! Now Lv.${res.levelsGained.at(-1)}`);
        if (res.ended) return sendRunResult(sock, jid, msg, character, res);
        await sock.sendMessage(jid, { text: lines.join("\n") + `\n\n• *.rpg next* to continue` }, { quoted: msg });
        return;
      }
      if (res.ended) return sendRunResult(sock, jid, msg, character, res);

      const healNote = res.healed ? ` (+${res.healed} HP)` : "";
      const lastLine = `✨ ${cls.skillName}! You hit for ${res.playerHit.dmg}${healNote} — enemy hits back for ${res.enemyHit.dmg}`;
      return sendBattleCard(sock, jid, character, run, lastLine);
    }

    // ── flee ─────────────────────────────────────────────────────────────
    if (sub === "flee" || sub === "run") {
      const run = getRun(sender);
      if (!run || run.status !== "battle") return sock.sendMessage(jid, { text: "❌ You're not in a battle." }, { quoted: msg });

      const res = flee(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Can't flee right now." }, { quoted: msg });
      if (res.success) return sock.sendMessage(jid, { text: `🏃 You fled the battle safely! The dungeon run has ended.` }, { quoted: msg });
      if (res.ended) {
        const character = getCharacter(sender);
        return sendRunResult(sock, jid, msg, character, res);
      }
      return sock.sendMessage(jid, { text: `❌ Failed to flee! The ${run.enemy.name} hits you for ${res.enemyHit.dmg}. (${res.playerHp} HP left)` }, { quoted: msg });
    }

    // ── heal ─────────────────────────────────────────────────────────────
    if (sub === "heal" || sub === "potion") {
      const res = usePotion(sender);
      if (!res.ok) {
        const map = { "no-character": "❌ No character yet.", "no-potions": "❌ You're out of potions.", "full-hp": "✅ You're already at full HP." };
        return sock.sendMessage(jid, { text: map[res.reason] || "❌ Can't heal right now." }, { quoted: msg });
      }
      const run = getRun(sender);
      const text = `🧪 Healed ${res.healed} HP (${res.hp} HP now, ${res.potions} potion${res.potions === 1 ? "" : "s"} left)`;
      if (run && run.status === "battle") {
        const character = getCharacter(sender);
        await sock.sendMessage(jid, { text }, { quoted: msg });
        return sendBattleCard(sock, jid, character, run);
      }
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── status ───────────────────────────────────────────────────────────
    if (sub === "status") {
      const run = getRun(sender);
      if (!run) return sock.sendMessage(jid, { text: "❌ No active run — start one with *.rpg enter*" }, { quoted: msg });
      const character = getCharacter(sender);
      if (run.status === "battle") return sendBattleCard(sock, jid, character, run);
      if (run.pendingEvent) {
        const e = run.pendingEvent;
        return sock.sendMessage(jid, { text: `❓ *${e.text}*\n\n1️⃣ ${e.options[0].label}\n2️⃣ ${e.options[1].label}\n\n• *.rpg choice 1* or *.rpg choice 2*` }, { quoted: msg });
      }
      if (run.merchantOffer) {
        const o = run.merchantOffer;
        return sock.sendMessage(jid, { text: `🛒 ${o.label} — $${o.price}\n\n• *.rpg buy* or *.rpg next*` }, { quoted: msg });
      }
      return sendRoomCard(sock, jid, msg, { type: "corridor", room: run.room, detail: "", difficulty: DIFFICULTIES[run.difficulty]?.label });
    }

    // ── abandon ──────────────────────────────────────────────────────────
    if (sub === "abandon" || sub === "giveup") {
      const res = abandonRun(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ No active run to abandon." }, { quoted: msg });
      return sock.sendMessage(jid, { text: "🚪 You retreated from the dungeon. Progress on this run is lost." }, { quoted: msg });
    }

    // ── default ──────────────────────────────────────────────────────────
    const character = getCharacter(sender);
    if (!character) {
      return sock.sendMessage(jid, {
        text: `🏰 *RPG*\n\nYou don't have a hero yet!\n\n${Object.entries(CLASSES).map(([k, c]) => `• *.rpg create ${k}* — ${c.label}`).join("\n")}`,
      }, { quoted: msg });
    }
    return sendCharacterCard(sock, jid, msg, character, `• *.rpg enter [easy|normal|hard|nightmare]* to start a run\n• *.rpg help* for all commands`);
  },
};
