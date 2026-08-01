// plugins/dragonball/dhunt.js
// PvE villain hunt — villains spawn from the Dragon Ball villain roster
// Turn flow mirrors dbattle.js: each hit gets its own canvas frame.
//
// Commands:
//   .dhunt              — spawn a villain and start the battle
//   .dhunt attack       — basic physical attack
//   .dhunt ki <1-N>     — use a learned technique
//   .dhunt flee         — escape (penalty)

import players       from "../../lib/dragonball/players.js";
import enemyRoster   from "../../lib/dragonball/enemies.js";
import techniqueLib  from "../../lib/dragonball/techniques.js";
import { createHunt, getHunt, deleteHunt, armHuntTimer } from "../../lib/huntState.mjs";
import { getCharacterImage } from "../../lib/dragonballAPI.mjs";
import { generateHuntScene, generateResultScene } from "../../lib/dbzBattleCanvas.mjs";
import {
  calculateDamage, healthBar, kiBar, chance, random,
  getAttackMessage, getTechniqueMessage, getSpawnMessage, getRankName,
} from "../../lib/dragonball/utils.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveEnemyImage(enemy) {
  if (!enemy.apiName) return null;
  try { return await getCharacterImage(enemy.apiName); } catch { return null; }
}

/** Select a villain matching (roughly) the player's level */
function pickVillain(playerLevel) {
  const eligible = enemyRoster.filter((e) => {
    const diff = e.level - playerLevel;
    return diff >= -8 && diff <= 12;
  });
  const pool = eligible.length ? eligible : enemyRoster;
  return { ...random(pool) };   // clone so we don't mutate the roster
}

/** Pokémon-style status block — shows player's name, not "You". */
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

/** Build the Pokémon-style action menu */
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
    `👊 *.dhunt attack*   — Physical Strike`,
  ];

  p.techniques.forEach((t, i) => {
    const cd   = p.cooldowns[t.id] || 0;
    const noKi = p.ki < t.ki;
    if (cd > 0) {
      lines.push(`🔒 *.dhunt ki ${i + 1}*  — ${t.name} ❌ cooldown: ${cd} turn(s)`);
    } else if (noKi) {
      lines.push(`⚠️ *.dhunt ki ${i + 1}*  — ${t.name} ❌ need ${t.ki} KI`);
    } else if (t.damage === 0) {
      lines.push(`✨ *.dhunt ki ${i + 1}*  — ${t.name} (support · ${t.ki} KI)`);
    } else {
      lines.push(`🌀 *.dhunt ki ${i + 1}*  — ${t.name} (${t.damage} dmg · ${t.ki} KI)`);
    }
  });

  lines.push(`🏃 *.dhunt flee*    — Escape (5% Zeni penalty)`);
  lines.push(`⏳ _3 minutes to act or hunt auto-cancels._`);
  return lines.join("\n");
}

/**
 * Send a hunt canvas image.  caption is shown under / beside the image.
 * Falls back to plain text if canvas generation fails.
 */
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
    console.error("DHUNT CANVAS ERROR:", err);
    return sock.sendMessage(jid, { text: caption });
  }
}

// ─── Plugin export ────────────────────────────────────────────────────────────

export default {
  name: "dhunt",
  description: "Hunt Dragon Ball villains for XP and Zeni",
  category: "dragonball",
  usage: ".dhunt | attack | ki <n> | flee",
  aliases: ["dvillain", "dspawn", "dbzhunt"],
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
            text: "❤️ You're too injured to hunt!\nUse *.dheal* or wait for HP to restore.",
          }, { quoted: msg });
        }

        const villain = pickVillain(playerDoc.level);
        villain.imageUrl = await resolveEnemyImage(villain);

        const techniques = (playerDoc.techniques || [])
          .map((id) => {
            const tid = typeof id === "string" ? id : id.id;
            return techniqueLib.find((t) => t.id === tid);
          })
          .filter(Boolean);

        const p = {
          username:   playerDoc.username || sender.split("@")[0],
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
        return sendHuntImage(sock, jid, hunt,
          `${spawnMsg}\n\n${buildMenu(hunt)}`
        );
      }

      // ── In-battle commands ─────────────────────────────────────────────────
      const hunt = getHunt(sender);
      if (!hunt) {
        return sock.sendMessage(jid, {
          text: "❌ No active hunt!\nUse *.dhunt* to find a villain.",
        }, { quoted: msg });
      }

      const { p, e } = hunt;
      const pName = p.username || playerDoc.username || "You";

      // KI regeneration each turn
      p.ki = Math.min(p.maxKi, p.ki + Math.floor(p.maxKi * 0.1));

      /**
       * Called after the player lands a hit.
       * PvP-style: sends the player's attack as its own canvas frame,
       * then sends the enemy's counterattack as a second canvas frame,
       * then sends the action menu as a plain text message.
       */
      async function applyDamageToEnemy(dmg, resultText) {
        e.hp = Math.max(0, e.hp - dmg);

        // Tick player cooldowns
        for (const id of Object.keys(p.cooldowns)) {
          p.cooldowns[id]--;
          if (p.cooldowns[id] <= 0) delete p.cooldowns[id];
        }

        // ── Frame 1: player's hit ────────────────────────────────────────────
        await sendHuntImage(sock, jid, hunt, resultText, { hitSide: "right", damage: dmg });

        if (e.hp <= 0) {
          // ── Victory! ──────────────────────────────────────────────────────
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

        // ── Enemy counterattack ──────────────────────────────────────────────
        let enemyDmg;
        let enemyMsg;
        const useTech = e.techniques?.length && chance(30);

        if (useTech) {
          const techId = random(e.techniques);
          const eTech  = techniqueLib.find((t) => t.id === techId);
          if (eTech && e.ki >= eTech.ki) {
            e.ki     = Math.max(0, (e.ki || 0) - eTech.ki);
            enemyDmg = Math.max(1, Math.floor(calculateDamage(e, p, eTech) * 0.9));
            enemyMsg = getTechniqueMessage(`*${e.name}*`, eTech.name, `*${pName}*`, enemyDmg);
          }
        }

        if (!enemyDmg) {
          enemyDmg = Math.max(1, calculateDamage(e, p));
          const isCrit = chance(10);
          enemyMsg = getAttackMessage(`*${e.name}*`, `*${pName}*`, enemyDmg, isCrit);
          if (isCrit) enemyDmg = Math.floor(enemyDmg * 1.6);
        }

        p.hp = Math.max(0, p.hp - enemyDmg);
        hunt.round++;

        // ── Frame 2: enemy's counterattack ───────────────────────────────────
        if (p.hp <= 0) {
          // Player defeated
          const loseZeni = Math.floor((playerDoc.zeni || 0) * 0.05);
          await players.update(sender, { $inc: { zeni: -loseZeni, losses: 1 }, $set: { hp: 1 } });
          deleteHunt(sender);

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

        // Both alive — enemy frame then action menu
        await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
        return sock.sendMessage(jid, { text: buildMenu(hunt) });
      }

      // ── ATTACK ────────────────────────────────────────────────────────────
      if (cmd === "attack") {
        const isCrit = chance(12);
        const dmg    = calculateDamage(p, e);
        const txt    = getAttackMessage(`*${pName}*`, `*${e.name}*`, dmg, isCrit);
        return applyDamageToEnemy(dmg, txt);
      }

      // ── KI TECHNIQUE ─────────────────────────────────────────────────────
      if (cmd === "ki") {
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

        // Support techniques (apply to self, still trigger enemy counterattack)
        if (tech.effect === "defense_up") {
          p.defense = Math.floor(p.defense * 1.3);

          // Regen enemy turn
          e.ki = Math.min(e.maxKi || 200, (e.ki || 0) + Math.floor((e.maxKi || 200) * 0.08));

          // Tick cooldowns
          for (const id of Object.keys(p.cooldowns)) {
            p.cooldowns[id]--;
            if (p.cooldowns[id] <= 0) delete p.cooldowns[id];
          }

          await sendHuntImage(sock, jid, hunt, [
            `🛡️ *ENERGY SHIELD!*`,
            `🔵 *${pName}* generates a Ki barrier — defense boosted 30%!`,
          ].join("\n"));

          // Enemy still attacks back
          let enemyDmg = Math.max(1, calculateDamage(e, p));
          const isCrit  = chance(10);
          let enemyMsg  = getAttackMessage(`*${e.name}*`, `*${pName}*`, enemyDmg, isCrit);
          if (isCrit) enemyDmg = Math.floor(enemyDmg * 1.6);
          p.hp = Math.max(0, p.hp - enemyDmg);
          hunt.round++;

          if (p.hp <= 0) {
            const loseZeni = Math.floor((playerDoc.zeni || 0) * 0.05);
            await players.update(sender, { $inc: { zeni: -loseZeni, losses: 1 }, $set: { hp: 1 } });
            deleteHunt(sender);
            await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
            return sock.sendMessage(jid, {
              text: `☠️ *${pName.toUpperCase()} WAS DEFEATED!*\n💀 *${e.name}* overwhelmed you!\n💰 Lost: *${loseZeni} Zeni*\n❤️ HP restored to 1.`,
            });
          }

          await sendHuntImage(sock, jid, hunt, enemyMsg, { hitSide: "left", damage: enemyDmg });
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
            `Use *.dhunt* to find another villain.`,
          ].join("\n"),
        }, { quoted: msg });
      }

      // Fallback
      return sock.sendMessage(jid, { text: buildMenu(hunt) }, { quoted: msg });

    } catch (err) {
      console.error("DHUNT ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Hunt failed — try again." }, { quoted: msg });
    }
  },
};
