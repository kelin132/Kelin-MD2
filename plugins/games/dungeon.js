// plugins/games/dungeon.js
// Text Dungeon Crawler — solo RPG run through your group chat, with canvas cards.

import {
  CLASSES,
  ROOMS_PER_RUN,
  getCharacter,
  createCharacter,
  startRun,
  getRun,
  abandonRun,
  advanceRoom,
  attack,
  flee,
  usePotion,
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
  const buf = await generateCharacterCard({ character });
  await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
}

async function sendRoomCard(sock, jid, msg, { type, room, detail }) {
  const buf = await generateRoomCard({ type, roomNumber: room, totalRooms: ROOMS_PER_RUN, detail });
  let caption;
  if (type === "treasure") {
    caption = `💰 *Treasure Room* (found ${detail})\n\n• *.dungeon next* to keep going`;
  } else if (type === "rest") {
    caption = `🔥 *Resting Point* (healed ${detail} HP)\n\n• *.dungeon next* to keep going`;
  } else if (type === "trap") {
    caption = `🕳 *Trap!* (took ${detail} damage)\n\n• *.dungeon next* to keep going`;
  } else {
    caption = `🚪 Room ${room}/${ROOMS_PER_RUN}`;
  }
  await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
}

async function sendBattleCard(sock, jid, character, enemy, lastLine) {
  const buf = await generateBattleCard({ character, enemy, lastLine });
  await sock.sendMessage(jid, {
    image: buf,
    caption:
      `⚔️ *${enemy.name}* (${enemy.hp}/${enemy.maxHp} HP) blocks the way!\n\n` +
      `• *.dungeon attack* (strike the enemy)\n` +
      `• *.dungeon flee* (50% chance to escape)\n` +
      `• *.dungeon heal* (use a potion mid-fight)`,
  });
}

async function sendRunResult(sock, jid, msg, character, result) {
  const buf = await generateResultCard({
    success: result.success,
    character,
    roomsCleared: result.roomsCleared,
    meta: result,
  });
  const lines = [];
  if (result.xpGainedTotal) lines.push(`+${result.xpGainedTotal} XP`);
  if (result.goldGainedTotal) lines.push(`+$${result.goldGainedTotal} gold`);
  if (result.goldLost) lines.push(`-$${result.goldLost} gold lost`);
  await sock.sendMessage(jid, {
    image: buf,
    caption:
      (result.success
        ? `🏆 *Dungeon cleared!* (all ${ROOMS_PER_RUN} rooms)`
        : `💀 *Run over* (reached room ${result.roomsCleared})`) +
      (lines.length ? `\n${lines.join("   •   ")}` : "") +
      `\n\n• *.dungeon enter* to try again\n• *.dungeon profile* to see your sheet`,
  }, { quoted: msg });
}

export default {
  name: "dungeon",
  aliases: ["dg", "rpg"],
  description: "Solo text dungeon crawler — create a hero, explore rooms, fight monsters, level up",
  category: "games",
  usage:
    ".dg create <warrior|mage|rogue> · .dg enter · .dg next · .dg attack · .dg flee · .dg heal · " +
    ".dg profile · .dg status · .dg abandon · .dg leaderboard",
  cooldown: 2,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();
    const name = displayName(msg, sender);

    // ── help ─────────────────────────────────────────────────────────────
    if (sub === "help") {
      return sock.sendMessage(
        jid,
        {
          text:
            `🏰 *Dungeon Crawler* (solo RPG run)\n\n` +
            `• *.dg create <warrior|mage|rogue>* (make your hero)\n` +
            `• *.dg enter* (start a run — ${ROOMS_PER_RUN} rooms, boss at the end)\n` +
            `• *.dg next* (advance after clearing a room)\n` +
            `• *.dg attack* (strike in battle)\n` +
            `• *.dg flee* (try to escape battle, 50/50)\n` +
            `• *.dg heal* (drink a potion, in or out of battle)\n` +
            `• *.dg profile* (your character sheet)\n` +
            `• *.dg status* (current room/battle)\n` +
            `• *.dg abandon* (give up the current run)\n` +
            `• *.dg leaderboard* (top heroes by level)`,
        },
        { quoted: msg }
      );
    }

    // ── create ───────────────────────────────────────────────────────────
    if (sub === "create") {
      const classKey = (args[1] || "").toLowerCase();
      if (!CLASSES[classKey]) {
        return sock.sendMessage(jid, {
          text: `Usage: *.dg create <class>*\n\nClasses:\n${Object.entries(CLASSES).map(([k, c]) => `• *${k}* — ${c.label} (${c.maxHp} HP, ${c.atk} ATK, ${c.def} DEF)`).join("\n")}`,
        }, { quoted: msg });
      }
      const res = createCharacter(sender, name, classKey);
      if (!res.ok) {
        return sock.sendMessage(jid, { text: "❌ You already have a character! Use *.dg profile* to view it." }, { quoted: msg });
      }
      return sendCharacterCard(sock, jid, msg, res.character, `🎉 *${name}* the ${CLASSES[classKey].label} was created!\n\n• *.dg enter* to start your first dungeon run.`);
    }

    // ── profile ──────────────────────────────────────────────────────────
    if (sub === "profile" || sub === "sheet") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet — create one with *.dg create <warrior|mage|rogue>*" }, { quoted: msg });
      return sendCharacterCard(sock, jid, msg, character);
    }

    // ── leaderboard ──────────────────────────────────────────────────────
    if (sub === "leaderboard" || sub === "top") {
      const entries = topCharacters(10);
      if (!entries.length) return sock.sendMessage(jid, { text: "📊 No heroes yet — be the first with *.dg create*!" }, { quoted: msg });
      const buf = await generateLeaderboardCard({ entries });
      return sock.sendMessage(jid, { image: buf, caption: "🏰 *Dungeon Leaderboard* (all groups combined)" });
    }

    // ── enter ────────────────────────────────────────────────────────────
    if (sub === "enter" || sub === "start") {
      const character = getCharacter(sender);
      if (!character) return sock.sendMessage(jid, { text: "❌ No character yet — create one with *.dg create <warrior|mage|rogue>*" }, { quoted: msg });
      const res = startRun(sender);
      if (!res.ok) {
        if (res.reason === "already-running") return sock.sendMessage(jid, { text: "⚠️ You already have a run in progress — try *.dg status*" }, { quoted: msg });
        return sock.sendMessage(jid, { text: "❌ Can't start a run right now." }, { quoted: msg });
      }
      await sock.sendMessage(jid, { text: `🕯 *${name}* steps into the dungeon... (${ROOMS_PER_RUN} rooms ahead, a boss waits at the end)\n\n• *.dg next* to open the first door.` }, { quoted: msg });
      return;
    }

    // ── next / continue ──────────────────────────────────────────────────
    if (sub === "next" || sub === "continue") {
      const run = getRun(sender);
      if (!run) return sock.sendMessage(jid, { text: "❌ No active run — start one with *.dg enter*" }, { quoted: msg });
      if (run.status === "battle") return sock.sendMessage(jid, { text: "⚔️ You're in a battle — use *.dg attack* or *.dg flee*." }, { quoted: msg });

      const res = advanceRoom(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Can't advance right now." }, { quoted: msg });

      if (res.type === "enemy" || res.type === "boss") {
        const character = getCharacter(sender);
        return sendBattleCard(sock, jid, character, res.enemy);
      }
      if (res.ended) {
        const character = getCharacter(sender);
        return sendRunResult(sock, jid, msg, character, res);
      }

      let detail = "";
      if (res.type === "treasure") detail = res.loot.label;
      if (res.type === "rest") detail = `+${res.healed}`;
      if (res.type === "trap") detail = `-${res.dmg}`;
      return sendRoomCard(sock, jid, msg, { type: res.type, room: res.room, detail });
    }

    // ── attack ───────────────────────────────────────────────────────────
    if (sub === "attack" || sub === "atk") {
      const run = getRun(sender);
      if (!run || run.status !== "battle") return sock.sendMessage(jid, { text: "❌ You're not in a battle. Use *.dg next* to explore." }, { quoted: msg });

      const res = attack(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Can't attack right now." }, { quoted: msg });
      const character = getCharacter(sender);

      if (res.enemyDefeated) {
        const lines = [`💥 You defeated the enemy! +${res.xpGained} XP, +$${res.goldGained} gold`];
        if (res.levelsGained?.length) lines.push(`🌟 Level up! Now Lv.${res.levelsGained.at(-1)}`);
        if (res.ended) {
          return sendRunResult(sock, jid, msg, character, res);
        }
        await sock.sendMessage(jid, { text: lines.join("\n") + `\n\n• *.dg next* to continue` }, { quoted: msg });
        return;
      }

      if (res.ended) {
        return sendRunResult(sock, jid, msg, character, res);
      }

      const critNote = res.playerHit.isCrit ? " 💥 CRIT!" : "";
      const lastLine = `You hit for ${res.playerHit.dmg}${critNote} — enemy hits back for ${res.enemyHit.dmg}`;
      return sendBattleCard(sock, jid, character, run.enemy, lastLine);
    }

    // ── flee ─────────────────────────────────────────────────────────────
    if (sub === "flee" || sub === "run") {
      const run = getRun(sender);
      if (!run || run.status !== "battle") return sock.sendMessage(jid, { text: "❌ You're not in a battle." }, { quoted: msg });

      const res = flee(sender);
      if (!res.ok) return sock.sendMessage(jid, { text: "❌ Can't flee right now." }, { quoted: msg });

      if (res.success) {
        return sock.sendMessage(jid, { text: `🏃 You fled the battle safely! The dungeon run has ended.` }, { quoted: msg });
      }
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
        return sendBattleCard(sock, jid, character, run.enemy);
      }
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── status ───────────────────────────────────────────────────────────
    if (sub === "status") {
      const run = getRun(sender);
      if (!run) return sock.sendMessage(jid, { text: "❌ No active run — start one with *.dg enter*" }, { quoted: msg });
      const character = getCharacter(sender);
      if (run.status === "battle") return sendBattleCard(sock, jid, character, run.enemy);
      return sendRoomCard(sock, jid, msg, { type: "corridor", room: run.room, detail: "" });
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
        text: `🏰 *Dungeon Crawler*\n\nYou don't have a hero yet!\n\n${Object.entries(CLASSES).map(([k, c]) => `• *.dg create ${k}* — ${c.label}`).join("\n")}`,
      }, { quoted: msg });
    }
    return sendCharacterCard(sock, jid, msg, character, `• *.dg enter* to start a run\n• *.dg help* for all commands`);
  },
};
