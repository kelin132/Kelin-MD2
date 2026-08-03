// plugins/dragonball/dbzhunt.js
// PvE villain hunt — villains spawn from the Dragon Ball villain roster
// Turn flow mirrors dbzbattle: each hit gets its own canvas frame.
//
// Commands:
//   .dbzhunt              — spawn a villain and start the battle
//   .dbzhunt attack       — basic physical attack
//   .dbzhunt ki <1-N>     — use a learned technique
//   .dbzhunt flee         — escape (penalty)

import players       from "../../lib/dragonball/players.js";
import enemyRoster   from "../../lib/dragonball/enemies.js";
import techniqueLib  from "../../lib/dragonball/techniques.js";
import { createHunt, getHunt, deleteHunt, armHuntTimer } from "../../lib/huntState.mjs";
import { getCharacterImage, getCharacterInfo } from "../../lib/dragonballAPI.mjs";
import { generateHuntScene, generateResultScene } from "../../lib/dbzBattleCanvas.mjs";
import { applyTransform, spendKi } from "../../lib/dbz/gameLogic.mjs";
import {
  calculateDamage, healthBar, kiBar, chance, random,
  getAttackMessage, getTechniqueMessage, getSpawnMessage, getRankName,
} from "../../lib/dragonball/utils.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BATTLE_MESSAGE_DELAY = 3000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveEnemyImage(enemy) {
  if (!enemy.apiName) return null;
  try { return await getCharacterImage(enemy.apiName); } catch { return null; }
}

async function resolvePlayerForms(playerDoc) {
  if (Array.isArray(playerDoc.forms)) return playerDoc.forms;
  try {
    const character = await getCharacterInfo(playerDoc.character);
    return (character?.transformations || []).map((form, index) => ({
      formIndex: index + 1,
      name: form.title || form.name || `Form ${index + 1}`,
      imageUrl: form.image || null,
      statMultiplier: Number((1.3 + index * 0.25).toFixed(2)),
      auraColor: index === 0 ? "#ffdd00" : index === 1 ? "#88aaff" : "#ff6600",
    }));
  } catch {
    return [];
  }
}

/** Select a villain matching (roughly) the player's level. */
function pickVillain(playerLevel) {
  const level = Math.max(1, Math.floor(Number(playerLevel) || 1));
  // Keep new fighters in the Earthling/Z-Fighter part of the roster.
  // The old +12 ceiling could put a level-1 player against Nappa or Dodoria.
  const beginner = level <= 5;
  const minLevel = beginner ? 1 : Math.max(1, level - 8);
  const maxLevel = level + (beginner ? 2 : 12);
  const eligible = enemyRoster.filter((e) => {
    return e.level >= minLevel && e.level <= maxLevel;
  });
  const pool = eligible.length
    ? eligible
    : enemyRoster.filter((e) => e.level <= maxLevel);
  return { ...random(pool) };
}

/** Make the first few hunts forgiving without weakening later encounters. */
function tuneBeginnerVillain(villain, playerLevel) {
  if (playerLevel > 5) return villain;

  const statScale = 0.85;
  return {
    ...villain,
    hp:      Math.max(30, Math.floor(villain.hp * statScale)),
    maxHp:   Math.max(30, Math.floor(villain.maxHp * statScale)),
    attack:  Math.max(5, Math.floor(villain.attack * statScale)),
    defense: Math.max(3, Math.floor(villain.defense * statScale)),
  };
}

function beginnerEnemyDamage(damage, playerLevel) {
  if (playerLevel > 5) return damage;
  return Math.max(1, Math.floor(damage * 0.65));
}

/** Pokémon-style status block — shows the player's name. */
function statusBlock(p, e) {
  const pName = p.username || "You";
  const php = Math.max(0, p.hp), pki = Math.max(0, p.ki);
  const ehp = Math.max(0, e.hp);
  return [
    `🟠 *${pName}*`,
    `  ❤️ HP: ${php}/${p.maxHp} ${healthBar(php, p.maxHp, 10)}`,
    `  💠 KI: ${pki}/${p.maxKi} ${kiBar(pki, p.maxKi, 8)}`,
    ``,
    `🔴 *${e.name}* (Lv ${e.level})`,
    `  ❤️ HP: ${ehp}/${e.maxHp} ${healthBar(ehp, e.maxHp, 10)}`,
  ].join("\n");
}

/** Build the action menu */
function buildMenu(hunt) {
  const { p, e, round } = hunt;
  const pName = p.username || "You";
  const lines = [
    `🐉 *VILLAIN HUNT — Round ${round}* 🐉`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    statusBlock(p, e),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ *${pName}, what will you do?*`,
    ``,
    `👊 *.dbzhunt attack*   — Physical Strike`,
    `🌟 *.dbzhunt transform* — Change form (30 KI)`,
  ];

  p.techniques.forEach((t, i) => {
    const cd   = p.cooldowns[t.id] || 0;
    const noKi = p.ki < t.ki;
    if (cd > 0) {
      lines.push(`🔒 *.dbzhunt ki ${i + 1}*  — ${t.name} ❌ cooldown: ${cd} turn(s)`);
    } else if (noKi) {
      lines.push(`⚠️ *.dbzhunt ki ${i + 1}*  — ${t.name} ❌ need ${t.ki} KI`);
    } else if (t.damage === 0) {
      lines.push(`✨ *.dbzhunt ki ${i + 1}*  — ${t.name} (support · ${t.ki} KI)`);
    } else {
      lines.push(`🌀 *.dbzhunt ki ${i + 1}*  — ${t.name} (${t.damage} dmg · ${t.ki} KI)`);
    }
  });

  lines.push(`🏃 *.dbzhunt flee*    — Escape (5% Zeni penalty)`);
  lines.push(`⏳ _3 minutes to act or hunt auto-cancels._`);
  return lines.join("\n");
}

async function sendHuntImage(sock, jid, hunt, caption, opts = {}) {
  try {
    const buffer = await generateHuntScene({
      player:  hunt.p,
      enemy:   hunt.e,
      round:   hunt.round,
      hitSide: opts.hitSide || null,
      damage:  opts.damage  || null,
    });
    return sock.sendMessage(jid, { image: buffer, caption });
  } catch (err) {
    console.error("DBZHUNT CANVAS ERROR:", err);
    return sock.sendMessage(jid, { text: caption });
  }
}

// ─── Plugin export ────────────────────────────────────────────────────────────

export default {
  name: "dbzhunt",
  description: "Hunt Dragon Ball villains for XP and Zeni",
  category: "dragonball",
  usage: ".dbzhunt | attack | ki <n> | transform | flee",
  aliases: ["dbzvillain", "dbzspawn"],
  cooldown: 2,

  async run({ sock, msg, text, sender, args }) {
    const jid = msg.key.remoteJid;
    const cmd = (args?.[0] || "").toLowerCase();

    try {
      const playerDoc = await players.get(sender);
      if (!playerDoc) {
        return sock.sendMessage(jid, {
          text: "🐉 You don't have a fighter!\nUse *.dbzstart* to create one.",
        }, { quoted: msg });
      }

      // ── SPAWN new villain ──────────────────────────────────────────────────
      if (!cmd || cmd === "hunt") {
        const existingHunt = getHunt(sender);
        if (existingHunt) {
          return sock.sendMessage(jid, {
            text: `⚔️ You already have an active battle!\n\n${buildMenu(existingHunt)}`,
          }, { quoted: msg });
        }

        if (playerDoc.hp <= 0) {
          return sock.sendMessage(jid, {
            text: "❤️ You're too injured to hunt!\nUse *.dbzheal* or wait for HP to restore.",
          }, { quoted: msg });
        }

        const villain = tuneBeginnerVillain(
          pickVillain(playerDoc.level),
          Math.max(1, Number(playerDoc.level) || 1)
        );
        villain.imageUrl = await resolveEnemyImage(villain);

        const techniques = (playerDoc.techniques || [])
          .map((id) => {
            const tid = typeof id === "string" ? id : id.id;
            return techniqueLib.find((t) => t.id === tid);
          })
          .filter(Boolean);

        const p = {
          username:   playerDoc.username || sender.split("@")[0],
          character:   playerDoc.character || null,
          level:      playerDoc.level || 1,
          hp:         playerDoc.hp,
          maxHp:      playerDoc.maxHp,
          ki:         playerDoc.ki,
          maxKi:      playerDoc.maxKi,
          attack:     playerDoc.attack,
          defense:    playerDoc.defense,
          speed:      playerDoc.speed,
          techniques,
          cooldowns:  {},
          imageUrl:   playerDoc.characterImageUrl || null,
          forms:      await resolvePlayerForms(playerDoc),
          currentFormIndex: 0,
          currentFormName: playerDoc.character || null,
          transformed: false,
          auraColor: null,
        };

        const hunt = createHunt(sender, { p, e: villain, round: 1 });

        armHuntTimer(hunt, async () => {
          if (!getHunt(sender)) return;
          await sock.sendMessage(jid, {
            text: `⏰ Hunt expired — *${villain.name}* escaped while you were distracted!`,
          });
          deleteHunt(sender);
        });

        const spawnMsg = getSpawnMessage(villain.name, villain.level);
        return sendHuntImage(sock, jid, hunt, `${spawnMsg}\n\n${buildMenu(hunt)}`);
      }

      // ── In-battle commands ─────────────────────────────────────────────────
      const hunt = getHunt(sender);
      if (!hunt) {
        return sock.sendMessage(jid, {
          text: "❌ No active hunt!\nUse *.dbzhunt* to find a villain.",
        }, { quoted: msg });
      }

      const { p, e } = hunt;
      const pName = p.username || playerDoc.username || "You";

      // KI regeneration each turn
      p.ki = Math.min(p.maxKi, p.ki + Math.floor(p.maxKi * 0.1));

      /**
       * PvP-style flow:
       * Frame 1 — player's hit lands on villain  (hitSide: "right")
       * Frame 2 — villain counterattacks player  (hitSide: "left")
       * Then  — action menu as plain text
       */
      async function applyDamageToEnemy(dmg, resultText) {
        e.hp = Math.max(0, e.hp - dmg);

        for (const id of Object.keys(p.cooldowns)) {
          p.cooldowns[id]--;
          if (p.cooldowns[id] <= 0) delete p.cooldowns[id];
        }

        // Give the player enough time to read the attack message before
        // rendering the next battle event.
        await sleep(BATTLE_MESSAGE_DELAY);
        // Frame 1: player hits villain
        await sendHuntImage(sock, jid, hunt, resultText, { hitSide: "right", damage: dmg });

        if (e.hp <= 0) {
          // ── Victory ──────────────────────────────────────────────────────
          const xpGain   = e.xpReward;
          const zeniGain = e.zeniReward;

          await Promise.all([
            players.addXp(sender, xpGain),
            players.addZeni(sender, zeniGain),
            (async () => {
              const fresh = await players.get(sender);
              if (fresh) {
                fresh.hp = p.hp; fresh.ki = p.ki;
                fresh.missionsCompleted = (fresh.missionsCompleted || 0) + 1;
                await fresh.save();
              }
            })(),
          ]);

          deleteHunt(sender);

          let resultBuf = null;
          try {
            resultBuf = await generateResultScene({
              winner: { username: pName,  imageUrl: p.imageUrl  },
              loser:  { username: e.name, imageUrl: e.imageUrl  },
              rewardText: `💰 +${zeniGain} Zeni  |  ✨ +${xpGain} XP`,
              outcome: "win",
            });
          } catch { /**/ }

          const caption = [
            `🏆 *VILLAIN DEFEATED!*`,
            `💀 *${e.name}* has been eliminated!`,
            ``,
            `💰 Reward: *+${zeniGain} Zeni* | ✨ *+${xpGain} XP*`,
            `❤️ HP remaining: ${p.hp}/${p.maxHp}`,
          ].join("\n");

          if (resultBuf) return sock.sendMessage(jid, { image: resultBuf, caption });
          return sock.sendMessage(jid, { text: caption });
        }

        // ── Enemy counterattack ───────────────────────────────────────────
        let enemyDmg, enemyMsg;
        const useTech = e.techniques?.length && chance(30);

        if (useTech) {
          const techId = random(e.techniques);
          const eTech  = techniqueLib.find((t) => t.id === techId);
          if (eTech && e.ki >= eTech.ki) {
            e.ki     = Math.max(0, (e.ki || 0) - eTech.ki);
            enemyDmg = beginnerEnemyDamage(
              Math.max(1, Math.floor(calculateDamage(e, p, eTech) * 0.9)),
              p.level
            );
            enemyMsg = getTechniqueMessage(`*${e.name}*`, eTech.name, `*${pName}*`, enemyDmg);
          }
        }

        if (!enemyDmg) {
          enemyDmg = beginnerEnemyDamage(
            Math.max(1, calculateDamage(e, p)),
            p.level
          );
          const isCrit = chance(10);
          enemyMsg = getAttackMessage(`*${e.name}*`, `*${pName}*`, enemyDmg, isCrit);
          if (isCrit) enemyDmg = Math.floor(enemyDmg * 1.6);
        }

        p.hp = Math.max(0, p.hp - enemyDmg);
        hunt.round++;

        // Frame 2: villain counterattacks
        if (p.hp <= 0) {
          const loseZeni = Math.floor((playerDoc.zeni || 0) * 0.05);
          await players.update(sender, { $inc: { zeni: -loseZeni, losses: 1 }, $set: { hp: 1 } });
          deleteHunt(sender);

          await sleep(BATTLE_MESSAGE_DELAY);
          await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
          return sock.sendMessage(jid, {
            text: [
              `☠️ *${pName.toUpperCase()} WAS DEFEATED!*`,
              `💀 *${e.name}* overwhelmed you!`,
              `💰 Lost: *${loseZeni} Zeni* (5% penalty)`,
              `❤️ HP restored to 1 — heal up before hunting again.`,
            ].join("\n"),
          });
        }

        await sleep(BATTLE_MESSAGE_DELAY);
        await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
        armHuntTimer(hunt, async () => {
          if (!getHunt(sender)) return;
          await sock.sendMessage(jid, {
            text: `⏰ Hunt expired — *${e.name}* escaped while you were distracted!`,
          });
          deleteHunt(sender);
        });
        await sleep(BATTLE_MESSAGE_DELAY);
        return sock.sendMessage(jid, { text: buildMenu(hunt) });
      }

      // ── ATTACK ────────────────────────────────────────────────────────────
      if (cmd === "attack") {
        const isCrit = chance(12);
        const dmg    = calculateDamage(p, e);
        const txt    = getAttackMessage(`*${pName}*`, `*${e.name}*`, dmg, isCrit);
        return applyDamageToEnemy(dmg, txt);
      }

      // ── TRANSFORM ─────────────────────────────────────────────────────────
      if (cmd === "transform" || cmd === "form" || cmd === "powerup") {
        if (!p.forms?.length) {
          return sock.sendMessage(jid, {
            text: "🌟 Your fighter has no unlocked forms yet. Choose a character with transformations first.",
          }, { quoted: msg });
        }

        const spent = spendKi(p, 30);
        if (!spent) {
          return sock.sendMessage(jid, {
            text: `❌ Not enough KI to transform! Need 30 KI, have ${Math.floor(p.ki || 0)}.`,
          }, { quoted: msg });
        }

        const transformed = applyTransform(spent);
        if (!transformed) {
          return sock.sendMessage(jid, {
            text: "❌ You are already using your strongest available form.",
          }, { quoted: msg });
        }

        const previousName = p.currentFormName || p.character || p.username;
        Object.assign(p, transformed);
        await sleep(BATTLE_MESSAGE_DELAY);
        await sendHuntImage(sock, jid, hunt, [
          `🌟 *${previousName}* powers up into *${p.currentFormName}*!`,
          `⚔️ Attack: *${p.attack}*  🛡️ Defense: *${p.defense}*`,
          `💠 KI spent: *30*`,
        ].join("\n"));

        // Changing form consumes the turn, so the villain gets a response.
        const enemyDmg = beginnerEnemyDamage(
          Math.max(1, calculateDamage(e, p)),
          p.level
        );
        p.hp = Math.max(0, p.hp - enemyDmg);
        hunt.round++;
        const enemyMsg = getAttackMessage(`*${e.name}*`, `*${pName}*`, enemyDmg, false);
        await sleep(BATTLE_MESSAGE_DELAY);
        await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });

        if (p.hp <= 0) {
          const loseZeni = Math.floor((playerDoc.zeni || 0) * 0.05);
          await players.update(sender, { $inc: { zeni: -loseZeni, losses: 1 }, $set: { hp: 1 } });
          deleteHunt(sender);
          await sleep(BATTLE_MESSAGE_DELAY);
          return sock.sendMessage(jid, {
            text: `☠️ *${pName.toUpperCase()} WAS DEFEATED!*\n💀 *${e.name}* overwhelmed you!\n💰 Lost: *${loseZeni} Zeni*`,
          }, { quoted: msg });
        }

        armHuntTimer(hunt, async () => {
          if (!getHunt(sender)) return;
          await sock.sendMessage(jid, {
            text: `⏰ Hunt expired — *${e.name}* escaped while you were distracted!`,
          });
          deleteHunt(sender);
        });
        await sleep(BATTLE_MESSAGE_DELAY);
        return sock.sendMessage(jid, { text: buildMenu(hunt) });
      }

      // ── KI TECHNIQUE ─────────────────────────────────────────────────────
      if (cmd === "ki" || cmd === "technique" || cmd === "power") {
        const idx = parseInt(args?.[1], 10) - 1;
        if (isNaN(idx) || !p.techniques[idx]) {
          return sock.sendMessage(jid, { text: buildMenu(hunt) }, { quoted: msg });
        }

        const tech = p.techniques[idx];
        const cd   = p.cooldowns[tech.id] || 0;

        if (cd > 0) return sock.sendMessage(jid, { text: `🔒 *${tech.name}* is on cooldown (${cd} turns)!` }, { quoted: msg });
        if (p.ki < tech.ki) return sock.sendMessage(jid, { text: `⚠️ Not enough KI! Need ${tech.ki} (have ${p.ki}).` }, { quoted: msg });

        p.ki -= tech.ki;
        if (tech.cooldown > 0) p.cooldowns[tech.id] = tech.cooldown;

        // Support technique (still triggers enemy counterattack)
        if (tech.effect === "defense_up") {
          p.defense = Math.floor(p.defense * 1.3);
          e.ki = Math.min(e.maxKi || 200, (e.ki || 0) + Math.floor((e.maxKi || 200) * 0.08));

          for (const id of Object.keys(p.cooldowns)) {
            p.cooldowns[id]--;
            if (p.cooldowns[id] <= 0) delete p.cooldowns[id];
          }

          await sendHuntImage(sock, jid, hunt, [
            `🛡️ *ENERGY SHIELD!*`,
            `🔵 *${pName}* generates a Ki barrier — defense boosted 30%!`,
          ].join("\n"));

          await sleep(BATTLE_MESSAGE_DELAY);
          let enemyDmg = beginnerEnemyDamage(
            Math.max(1, calculateDamage(e, p)),
            p.level
          );
          const isCrit  = chance(10);
          let enemyMsg  = getAttackMessage(`*${e.name}*`, `*${pName}*`, enemyDmg, isCrit);
          if (isCrit) enemyDmg = Math.floor(enemyDmg * 1.6);
          p.hp = Math.max(0, p.hp - enemyDmg);
          hunt.round++;

          if (p.hp <= 0) {
            const loseZeni = Math.floor((playerDoc.zeni || 0) * 0.05);
            await players.update(sender, { $inc: { zeni: -loseZeni, losses: 1 }, $set: { hp: 1 } });
            deleteHunt(sender);
            await sleep(BATTLE_MESSAGE_DELAY);
            await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
            return sock.sendMessage(jid, {
              text: `☠️ *${pName.toUpperCase()} WAS DEFEATED!*\n💀 *${e.name}* overwhelmed you!\n💰 Lost: *${loseZeni} Zeni*\n❤️ HP restored to 1.`,
            });
          }

          await sleep(BATTLE_MESSAGE_DELAY);
          await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
          armHuntTimer(hunt, async () => {
            if (!getHunt(sender)) return;
            await sock.sendMessage(jid, {
              text: `⏰ Hunt expired — *${e.name}* escaped while you were distracted!`,
            });
            deleteHunt(sender);
          });
          await sleep(BATTLE_MESSAGE_DELAY);
          return sock.sendMessage(jid, { text: buildMenu(hunt) });
        }

        const isCrit = chance(12);
        const dmg    = calculateDamage(p, e, tech);
        if (tech.selfDamage) p.hp = Math.max(0, p.hp - Math.floor(p.maxHp * tech.selfDamage));

        const txt = getTechniqueMessage(`*${pName}*`, tech.name, `*${e.name}*`, dmg, isCrit);
        return applyDamageToEnemy(dmg, txt);
      }

      // ── FLEE ─────────────────────────────────────────────────────────────
      if (cmd === "flee") {
        const penalty = Math.floor((playerDoc.zeni || 0) * 0.05);
        await players.update(sender, { $inc: { zeni: -penalty } });
        deleteHunt(sender);

        return sock.sendMessage(jid, {
          text: [
            `🏃 *${pName} fled from ${e.name}!*`,
            `💰 Penalty: *-${penalty} Zeni* (5%)`,
            ``,
            `Use *.dbzhunt* to find another villain.`,
          ].join("\n"),
        }, { quoted: msg });
      }

      // Fallback
      return sock.sendMessage(jid, { text: buildMenu(hunt) }, { quoted: msg });

    } catch (err) {
      console.error("DBZHUNT ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Hunt failed — try again." }, { quoted: msg });
    }
  },
};
