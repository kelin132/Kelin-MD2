// plugins/dragonball/dbattle.js
// Turn-based PvP battle system — Dragon Ball Z style
// Pokémon-style battle messages with DBZ arena canvas
//
// Commands:
//   .dbattle @user        — challenge another fighter
//   .dbattle accept       — accept incoming challenge
//   .dbattle attack       — basic physical attack
//   .dbattle ki <1-N>     — use a learned technique
//   .dbattle flee         — escape the battle

import players from "../../lib/dragonball/players.js";
import techniqueLib from "../../lib/dragonball/techniques.js";
import {
  createBattle, getBattle, deleteBattle, getBattleByPlayer, armTimer,
} from "../../lib/battleState.mjs";
import { getCharacterImage } from "../../lib/dragonballAPI.mjs";
import { generateBattleScene, generateResultScene } from "../../lib/dbzBattleCanvas.mjs";
import {
  calculateDamage, healthBar, kiBar, chance, random,
  getAttackMessage, getTechniqueMessage, getRankName,
} from "../../lib/dragonball/utils.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mention tag — used only for WhatsApp @mentions, not for display text. */
const tag = (jid) => `@${jid.split("@")[0]}`;

/** Display name — shows username if available, otherwise falls back to the mention tag. */
const name = (c) => c.username || tag(c.jid);

async function snap(doc) {
  const techniques = (doc.techniques || [])
    .map((id) => {
      const tid = typeof id === "string" ? id : id.id;
      return techniqueLib.find((t) => t.id === tid);
    })
    .filter(Boolean);

  let imageUrl = null;
  try { imageUrl = await getCharacterImage(doc.character); } catch { /**/ }

  return {
    jid:        doc.jid,
    username:   doc.username,
    race:       doc.race || null,
    character:  doc.character || null,
    imageUrl,
    hp:         doc.hp,
    maxHp:      doc.maxHp,
    ki:         doc.ki,
    maxKi:      doc.maxKi,
    attack:     doc.attack,
    defense:    doc.defense,
    speed:      doc.speed,
    techniques,
    inventory:  JSON.parse(JSON.stringify(doc.inventory || [])),
    cooldowns:  {},
  };
}

async function sendBattleImage(sock, gid, battle, caption, opts = {}) {
  try {
    const buffer = await generateBattleScene({
      left:    battle.challenger,
      right:   battle.opponent,
      round:   battle.round,
      hitSide: opts.hitSide || null,
      damage:  opts.damage  || null,
    });
    return sock.sendMessage(gid, { image: buffer, caption, mentions: opts.mentions });
  } catch (err) {
    console.error("DBZ BATTLE CANVAS ERROR:", err);
    return sock.sendMessage(gid, { text: caption, mentions: opts.mentions });
  }
}

async function sendResultImage(sock, gid, { winner, loser, rewardText, outcome, caption, mentions }) {
  try {
    const buffer = await generateResultScene({ winner, loser, rewardText, outcome });
    return sock.sendMessage(gid, { image: buffer, caption, mentions });
  } catch (err) {
    console.error("DBZ RESULT CANVAS ERROR:", err);
    return sock.sendMessage(gid, { text: caption, mentions });
  }
}

/** Pokémon-style HP/KI status line — shows the fighter's name, not their phone number. */
function statusLine(c) {
  const hp = Math.max(0, c.hp);
  const ki = Math.max(0, c.ki);
  return [
    `⚡ *${name(c)}*`,
    `  ❤️ HP: ${hp}/${c.maxHp} ${healthBar(hp, c.maxHp, 10)}`,
    `  💠 KI: ${ki}/${c.maxKi} ${kiBar(ki, c.maxKi, 8)}`,
  ].join("\n");
}

function tickCooldowns(c) {
  for (const id of Object.keys(c.cooldowns)) {
    c.cooldowns[id]--;
    if (c.cooldowns[id] <= 0) delete c.cooldowns[id];
  }
}

/** Build the Pokémon-style action prompt */
function buildPrompt(battle, mover) {
  const other = mover === battle.challenger ? battle.opponent : battle.challenger;
  const lines = [
    `🐉 *DRAGON BALL Z — Round ${battle.round}* 🐉`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    statusLine(mover),
    ``,
    statusLine(other),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ *${name(mover)}, what will you do?*`,
    ``,
    `👊 *.dbattle attack*   — Physical Strike`,
  ];

  mover.techniques.forEach((t, i) => {
    const cd      = mover.cooldowns[t.id] || 0;
    const noKi    = mover.ki < t.ki;
    if (cd > 0) {
      lines.push(`🔒 *.dbattle ki ${i + 1}*  — ${t.name} ❌ cooldown: ${cd} turn(s)`);
    } else if (noKi) {
      lines.push(`⚠️ *.dbattle ki ${i + 1}*  — ${t.name} ❌ need ${t.ki} KI`);
    } else if (t.damage === 0) {
      lines.push(`✨ *.dbattle ki ${i + 1}*  — ${t.name} (support · ${t.ki} KI)`);
    } else {
      lines.push(`🌀 *.dbattle ki ${i + 1}*  — ${t.name} (${t.damage} dmg · ${t.ki} KI${t.cooldown > 1 ? ` · ${t.cooldown}T cd` : ""})`);
    }
  });

  lines.push(`🏃 *.dbattle flee*    — Escape battle`);
  lines.push(`⏳ _2 minutes to act or battle auto-cancels._`);

  return lines.join("\n");
}

// ─── Plugin export ────────────────────────────────────────────────────────────

export default {
  name: "dbattle",
  description: "Turn-based Dragon Ball Z PvP battle",
  category: "dragonball",
  usage: ".dbattle @user | accept | attack | ki <n> | flee",
  aliases: ["dbz", "dzfight"],
  cooldown: 2,

  async run({ sock, msg, text, sender, args }) {
    const gid = msg.key.remoteJid;
    if (!gid.endsWith("@g.us")) {
      return sock.sendMessage(gid, { text: "⚔️ Dragon Ball battles can only be fought in group chats!" }, { quoted: msg });
    }

    const cmd       = (args?.[0] || "").toLowerCase();
    const mentioned = (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []);

    // ── CHALLENGE ─────────────────────────────────────────────────────────────
    if (!cmd || mentioned.length > 0) {
      const opponentJid = mentioned[0];
      if (!opponentJid) {
        return sock.sendMessage(gid, { text: "⚡ Tag someone to challenge!\nExample: *.dbattle @User*" }, { quoted: msg });
      }
      if (opponentJid === sender) {
        return sock.sendMessage(gid, { text: "🤔 You can't battle yourself!" }, { quoted: msg });
      }

      const existingBattle = getBattleByPlayer(sender);
      if (existingBattle) {
        return sock.sendMessage(gid, { text: "⚔️ You're already in a battle! Finish it first." }, { quoted: msg });
      }

      const [challengerDoc, opponentDoc] = await Promise.all([
        players.get(sender),
        players.get(opponentJid),
      ]);

      if (!challengerDoc) {
        return sock.sendMessage(gid, { text: "🐉 You don't have a fighter!\nUse *.dbzstart* to create one." }, { quoted: msg });
      }
      if (!opponentDoc) {
        return sock.sendMessage(gid, {
          text: `❌ ${opponentDoc?.username || tag(opponentJid)} doesn't have a fighter yet!`,
          mentions: [opponentJid],
        }, { quoted: msg });
      }

      const cName = challengerDoc.username || tag(sender);
      const oName = opponentDoc.username   || tag(opponentJid);

      const [challengerSnap, opponentSnap] = await Promise.all([snap(challengerDoc), snap(opponentDoc)]);
      const battle = createBattle(gid, challengerSnap, opponentSnap);
      battle.status = "pending";

      return sendBattleImage(sock, gid, battle,
        [
          `🐉 *BATTLE CHALLENGE!*`,
          ``,
          `⚡ *${cName}* (${challengerDoc.character || challengerDoc.race}) challenges *${oName}* (${opponentDoc.character || opponentDoc.race})!`,
          ``,
          `*${oName}*, do you accept?`,
          `👊 Type *.dbattle accept* to fight!`,
          `⏰ 2 minutes to accept or the challenge expires.`,
        ].join("\n"),
        { mentions: [sender, opponentJid] }
      );
    }

    // ── ACCEPT ────────────────────────────────────────────────────────────────
    if (cmd === "accept") {
      const battle = getBattle(gid);
      if (!battle || battle.status !== "pending") {
        return sock.sendMessage(gid, { text: "❌ No pending challenge to accept!" }, { quoted: msg });
      }
      if (battle.opponent.jid !== sender) {
        return sock.sendMessage(gid, { text: "❌ This challenge wasn't for you!" }, { quoted: msg });
      }

      battle.status = "active";
      battle.turn = "challenger";

      armTimer(battle, async () => {
        if (!getBattle(gid)) return;
        const cur = battle[battle.turn];
        await sock.sendMessage(gid, {
          text: `⏰ *${name(cur)} took too long — battle cancelled!*`,
          mentions: [cur.jid],
        });
        deleteBattle(gid);
      });

      return sendBattleImage(sock, gid, battle,
        [
          `🔥 *BATTLE BEGINS!*`,
          ``,
          `⚡ *${name(battle.challenger)}* (${battle.challenger.character || "?"}) VS *${name(battle.opponent)}* (${battle.opponent.character || "?"})`,
          ``,
          buildPrompt(battle, battle.challenger),
        ].join("\n"),
        { mentions: [battle.challenger.jid, battle.opponent.jid] }
      );
    }

    // ── IN-BATTLE COMMANDS ────────────────────────────────────────────────────
    const battle = getBattle(gid);
    if (!battle || battle.status !== "active") {
      return sock.sendMessage(gid, { text: "⚔️ No active battle in this group!\nUse *.dbattle @user* to start one." }, { quoted: msg });
    }

    const moverKey  = battle.turn;
    const mover     = battle[moverKey];
    const targetKey = moverKey === "challenger" ? "opponent" : "challenger";
    const target    = battle[targetKey];

    if (mover.jid !== sender) {
      return sock.sendMessage(gid, {
        text: `⏳ It's *${name(mover)}'s* turn — wait your turn!`,
        mentions: [mover.jid],
      }, { quoted: msg });
    }

    // KI regeneration each turn
    mover.ki = Math.min(mover.maxKi, mover.ki + Math.floor(mover.maxKi * 0.08));

    async function afterDamage(resultText, dmg, isCrit = false) {
      target.hp = Math.max(0, target.hp - dmg);
      tickCooldowns(mover);

      const isBattleOver = target.hp <= 0;

      // Send the attack result canvas
      await sendBattleImage(sock, gid, battle, resultText, {
        hitSide:  targetKey === "challenger" ? "left" : "right",
        damage:   dmg,
        mentions: [mover.jid, target.jid],
      });

      if (!isBattleOver) {
        battle.turn = targetKey;
        battle.round++;
        const next = battle[battle.turn];
        armTimer(battle, async () => {
          if (!getBattle(gid)) return;
          await sock.sendMessage(gid, {
            text: `⏰ *${name(next)} took too long — battle cancelled!*`,
            mentions: [next.jid],
          });
          deleteBattle(gid);
        });
        return sock.sendMessage(gid, {
          text: buildPrompt(battle, next),
          mentions: [next.jid],
        });
      }

      // ── Battle over ──
      const winner = mover, loser = target;
      const xpGain   = 80 + (loser.level || 1) * 4;
      const zeniGain = 150 + (loser.level || 1) * 8;

      const [winDoc, loseDoc] = await Promise.all([
        players.get(winner.jid), players.get(loser.jid),
      ]);

      if (winDoc)  { winDoc.wins    = (winDoc.wins    || 0) + 1; await players.addXp(winner.jid, xpGain); await players.addZeni(winner.jid, zeniGain); }
      if (loseDoc) { loseDoc.losses = (loseDoc.losses || 0) + 1; await loseDoc.save(); }

      deleteBattle(gid);

      return sendResultImage(sock, gid, {
        winner: { username: name(winner), imageUrl: winner.imageUrl },
        loser:  { username: name(loser),  imageUrl: loser.imageUrl  },
        rewardText: `🏆 +${zeniGain} Zeni  |  ✨ +${xpGain} XP`,
        outcome: "win",
        caption: [
          `🏆 *${name(winner)} WINS!*`,
          ``,
          `💀 *${name(loser)}* has been defeated!`,
          ``,
          `💰 Reward: *+${zeniGain} Zeni* | ✨ *+${xpGain} XP*`,
        ].join("\n"),
        mentions: [winner.jid, loser.jid],
      });
    }

    // ── ATTACK ────────────────────────────────────────────────────────────────
    if (cmd === "attack") {
      const isCrit = chance(12);
      const dmg    = calculateDamage(mover, target);
      const txt    = getAttackMessage(name(mover), name(target), dmg, isCrit);
      return afterDamage(txt, dmg, isCrit);
    }

    // ── KI TECHNIQUE ─────────────────────────────────────────────────────────
    if (cmd === "ki") {
      const idx = parseInt(args[1], 10) - 1;
      if (isNaN(idx) || !mover.techniques[idx]) {
        return sock.sendMessage(gid, {
          text: buildPrompt(battle, mover),
          mentions: [mover.jid],
        }, { quoted: msg });
      }

      const tech = mover.techniques[idx];
      const cd   = mover.cooldowns[tech.id] || 0;

      if (cd > 0) {
        return sock.sendMessage(gid, {
          text: `🔒 *${tech.name}* is on cooldown for ${cd} more turn(s)!`,
          mentions: [mover.jid],
        }, { quoted: msg });
      }
      if (mover.ki < tech.ki) {
        return sock.sendMessage(gid, {
          text: `⚠️ Not enough KI! *${tech.name}* needs ${tech.ki} KI (you have ${mover.ki}).`,
          mentions: [mover.jid],
        }, { quoted: msg });
      }

      mover.ki -= tech.ki;
      if (tech.cooldown > 0) mover.cooldowns[tech.id] = tech.cooldown;

      // Support techniques
      if (tech.effect === "defense_up") {
        mover.defense = Math.floor(mover.defense * 1.3);
        tickCooldowns(mover);
        battle.turn = targetKey;
        battle.round++;
        return sock.sendMessage(gid, {
          text: [
            `🛡️ *ENERGY SHIELD!*`,
            `🔵 *${name(mover)}* generates a Ki barrier — defense boosted by 30% this round!`,
            ``,
            buildPrompt(battle, target),
          ].join("\n"),
          mentions: [mover.jid, target.jid],
        });
      }

      if (tech.effect === "blind") {
        target.speed = Math.floor(target.speed * 0.7);
        tickCooldowns(mover);
        battle.turn = targetKey;
        battle.round++;
        return sock.sendMessage(gid, {
          text: [
            `☀️ *SOLAR FLARE!*`,
            `😵 *${name(target)}* is temporarily blinded — speed reduced!`,
            ``,
            buildPrompt(battle, target),
          ].join("\n"),
          mentions: [mover.jid, target.jid],
        });
      }

      // Damage technique
      const isCrit = chance(12);
      const dmg    = calculateDamage(mover, target, tech);

      // Self-destruct: damage attacker too
      if (tech.selfDamage) {
        const selfDmg = Math.floor(mover.maxHp * tech.selfDamage);
        mover.hp = Math.max(0, mover.hp - selfDmg);
      }

      const txt = getTechniqueMessage(name(mover), tech.name, name(target), dmg, isCrit);
      return afterDamage(txt, dmg, isCrit);
    }

    // ── FLEE ─────────────────────────────────────────────────────────────────
    if (cmd === "flee") {
      const [winDoc, loseDoc] = await Promise.all([
        players.get(target.jid), players.get(sender),
      ]);

      if (winDoc)  { winDoc.wins    = (winDoc.wins    || 0) + 1; await winDoc.save(); }
      if (loseDoc) { loseDoc.losses = (loseDoc.losses || 0) + 1; await loseDoc.save(); }

      await sendResultImage(sock, gid, {
        winner: { username: name(target), imageUrl: target.imageUrl },
        loser:  { username: name(mover),  imageUrl: mover.imageUrl  },
        rewardText: "🏃 Fled the battle!",
        outcome: "flee",
        caption: [
          `🏃 *${name(mover)} has fled the battle!*`,
          `🏆 *${name(target)}* wins by default!`,
        ].join("\n"),
        mentions: [mover.jid, target.jid],
      });

      deleteBattle(gid);
      return;
    }

    // Fallback — show current prompt
    return sock.sendMessage(gid, { text: buildPrompt(battle, mover), mentions: [mover.jid] }, { quoted: msg });
  },
};
