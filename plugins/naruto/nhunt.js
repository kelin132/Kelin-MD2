/**
 * plugins/naruto/nhunt.js
 * Turn-based PvE hunt battle system.
 *
 * Commands:
 *   .nhunt              — find an enemy and start a battle
 *   .nhunt attack       — basic attack (in active battle)
 *   .nhunt jutsu <n>    — use the nth jutsu (in active battle)
 *   .nhunt item <id>    — use a consumable/battle item (only in battle)
 *   .nhunt flee         — escape (5% ryo penalty + 10% max HP loss)
 */

import players   from "../../lib/naruto/players.js";
import enemies   from "../../lib/naruto/enemies.js";
import jutsuLib  from "../../lib/jutsu.js";
import itemsLib  from "../../lib/items.js";
import { random, chance, calculateDamage, healthBar, chakraBar } from "../../lib/naruto/utils.js";
import { createHunt, getHunt, deleteHunt, armHuntTimer } from "../../lib/huntState.mjs";
import { sendWithEnemyImage } from "../../lib/gifHelper.mjs";

// ── Display helpers ───────────────────────────────────────────────────────────

function hpBar(hp, max) {
  return `${Math.max(0, hp)}/${max} ${healthBar(Math.max(0, hp), max, 10)}`;
}

function cpBar(cp, max) {
  return `${Math.max(0, cp)}/${max} ${chakraBar(Math.max(0, cp), max, 8)}`;
}

/** Build the full action menu shown to the player between turns. */
function buildMenu(hunt) {
  const { p, e, round } = hunt;

  const lines = [
    `⚔️ *HUNT BATTLE — Round ${round}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👹 *${e.name}* (Lv ${e.level})`,
    `❤️ HP: ${hpBar(e.hp, e.maxHp)}`,
    ``,
    `🥷 *You*`,
    `❤️ HP: ${hpBar(p.hp, p.maxHp)}`,
    `💙 Chakra: ${cpBar(p.chakra, p.maxChakra)}`,
  ];

  // Active boosts
  const boostLines = Object.entries(p.boosts || {}).map(([stat, b]) =>
    `   ⬆️ +${b.amount} ${stat.toUpperCase()} (${b.turns} turn${b.turns > 1 ? "s" : ""} left)`
  );
  if (boostLines.length) { lines.push(``, `*Active Boosts:*`, ...boostLines); }

  lines.push(``, `*Choose your action:*`, `🥊 *.nhunt attack* — Basic attack`);

  // Jutsu list
  p.jutsu.forEach((j, i) => {
    const cd       = p.cooldowns[j.id] || 0;
    const noChakra = p.chakra < j.chakra;
    if (cd > 0) {
      lines.push(`🔒 *.nhunt jutsu ${i + 1}* — ${j.name} _(cooldown: ${cd} turn${cd > 1 ? "s" : ""})_`);
    } else if (noChakra) {
      lines.push(`⚠️ *.nhunt jutsu ${i + 1}* — ${j.name} _(need ${j.chakra}💙)_`);
    } else {
      lines.push(`🌀 *.nhunt jutsu ${i + 1}* — ${j.name} _(${j.damage} dmg, ${j.chakra}💙)_`);
    }
  });

  // Usable items
  const usable = p.inventory.filter(inv => {
    const def = itemsLib.find(x => x.id === inv.id);
    return def && ["consumable", "battle", "boost"].includes(def.type);
  });
  if (usable.length) {
    lines.push(``, `🎒 *Items (*.nhunt item <id>*)*:`);
    usable.forEach(inv => {
      const def = itemsLib.find(x => x.id === inv.id);
      if (!def) return;
      const detail = [];
      if (def.effect?.hp)    detail.push(`+${def.effect.hp} HP`);
      if (def.effect?.chakra) detail.push(`+${def.effect.chakra}💙`);
      if (def.attackBoost)   detail.push(`+${def.attackBoost} ATK`);
      if (def.defenseBoost)  detail.push(`+${def.defenseBoost} DEF`);
      if (def.damage)        detail.push(`${def.damage} dmg`);
      lines.push(`   • *${def.name}* ×${inv.amount || 1}  \`${inv.id}\`  _${detail.join(", ")}_`);
    });
  }

  lines.push(``, `🏃 *.nhunt flee* — Escape (5% ryo + 10% HP penalty)`);
  lines.push(`⏳ _3 minutes to act or battle auto-cancels._`);

  return lines.join("\n");
}

// ── Snapshot builders ─────────────────────────────────────────────────────────

function playerSnap(doc) {
  const jutsu = (doc.jutsu || [])
    .map(j => jutsuLib.find(x => x.id === (typeof j === "string" ? j : j.id)))
    .filter(Boolean);

  return {
    hp:        doc.hp,
    maxHp:     doc.maxHp,
    chakra:    doc.chakra,
    maxChakra: doc.maxChakra,
    attack:    doc.attack,
    defense:   doc.defense,
    speed:     doc.speed,
    jutsu,
    inventory: JSON.parse(JSON.stringify(doc.inventory || [])),
    cooldowns: {}, // jutsuId → turns remaining
    boosts:    {}, // stat   → { amount, turns }
  };
}

function enemySnap(enemy) {
  return {
    name:      enemy.name,
    level:     enemy.level,
    hp:        enemy.hp,
    maxHp:     enemy.hp,
    attack:    enemy.attack,
    defense:   enemy.defense,
    speed:     enemy.speed,
    chakra:    enemy.chakra,
    jutsu:     enemy.jutsu || [],
    xpReward:  enemy.xpReward || 30,
    ryoReward: enemy.ryoReward || 80,
  };
}

// ── Combat math ───────────────────────────────────────────────────────────────

/** Get effective stat value (base + active boost). */
function eff(snap, stat) {
  const base  = snap[stat];
  const boost = snap.boosts?.[stat];
  return boost ? base + boost.amount : base;
}

/** Tick cooldowns and boosts down by one turn. */
function tickTurn(p) {
  for (const id of Object.keys(p.cooldowns)) {
    if (--p.cooldowns[id] <= 0) delete p.cooldowns[id];
  }
  for (const stat of Object.keys(p.boosts || {})) {
    if (--p.boosts[stat].turns <= 0) delete p.boosts[stat];
  }
}

/** Player basic attack — mutates e.hp, returns log line. */
function doAttack(p, e) {
  const dmg = calculateDamage({ ...p, attack: eff(p, "attack") }, { ...e, defense: eff(e, "defense") }, null);
  e.hp -= dmg;
  const critical = chance(10);
  if (critical) { e.hp -= dmg; /* double already applied by calculateDamage — just flag */ }
  return critical
    ? `🥊 *CRITICAL HIT!* You strike for *${dmg}* damage!`
    : `🥊 You attack and deal *${dmg}* damage!`;
}

/** Player jutsu — mutates p.chakra, p.cooldowns, e.hp. Returns { msg } or { error }. */
function doJutsu(p, e, jutsu) {
  if ((p.cooldowns[jutsu.id] || 0) > 0)
    return { error: `🔒 *${jutsu.name}* is still on cooldown (${p.cooldowns[jutsu.id]} turn${p.cooldowns[jutsu.id] > 1 ? "s" : ""}).` };
  if (p.chakra < jutsu.chakra)
    return { error: `⚠️ Not enough chakra! *${jutsu.name}* needs ${jutsu.chakra}💙 (you have ${p.chakra}💙).` };

  p.chakra -= jutsu.chakra;
  const dmg = calculateDamage({ ...p, attack: eff(p, "attack") }, { ...e, defense: eff(e, "defense") }, jutsu);
  e.hp -= dmg;
  if (jutsu.cooldown) p.cooldowns[jutsu.id] = jutsu.cooldown;

  return { msg: `🌀 *${jutsu.name}!* You channel your chakra dealing *${dmg}* damage!` };
}

/** Enemy counter-attack — mutates p.hp, returns log line. */
function doEnemyTurn(e, p) {
  const TAUNTS = [
    `retaliates with`,
    `strikes back for`,
    `counters hard —`,
    `launches a fierce attack for`,
    `unleashes a powerful blow —`,
  ];

  // 30% chance to use a jutsu
  if (e.jutsu.length && chance(30)) {
    const jId   = random(e.jutsu);
    const jutsu = jutsuLib.find(j => j.id === jId);
    if (jutsu && e.chakra >= jutsu.chakra) {
      const dmg = calculateDamage({ ...e, attack: e.attack }, { ...p, defense: eff(p, "defense") }, jutsu);
      e.chakra -= jutsu.chakra;
      p.hp     -= dmg;
      return `👹 *${e.name}* uses *${jutsu.name}* dealing *${dmg}* damage!`;
    }
  }

  // Basic attack
  const dmg = calculateDamage({ ...e, attack: e.attack }, { ...p, defense: eff(p, "defense") }, null);
  p.hp -= dmg;
  return `👹 *${e.name}* ${random(TAUNTS)} *${dmg}* damage!`;
}

// ── Reward helpers ────────────────────────────────────────────────────────────

/**
 * XP reward: base + 10% per extra round + bonus for fighting above your level.
 * Multi-turn battles give noticeably more XP to reward skillful play.
 */
function calcXP(base, round, enemyLv, playerLv) {
  const roundBonus = Math.floor((round - 1) * base * 0.12);
  const levelBonus = Math.max(0, enemyLv - playerLv) * 6;
  return base + roundBonus + levelBonus;
}

/** 20% chance to drop a cheap consumable from the shop catalogue. */
function rollDrop() {
  if (!chance(20)) return null;
  const pool = itemsLib.filter(i => i.type === "consumable" && i.price <= 600);
  return pool.length ? random(pool) : null;
}

/** Apply level-up loop to a player doc in-place. Returns how many levels gained. */
function applyLevelUps(player) {
  let gained = 0;
  while (player.xp >= player.xpNeeded) {
    player.xp       -= player.xpNeeded;
    player.level++;
    player.xpNeeded  = Math.floor(player.xpNeeded * 1.25);
    player.maxHp    += 20;
    player.maxChakra += 15;
    player.attack   += 3;
    player.defense  += 2;
    player.speed    += 2;
    player.hp        = player.maxHp;
    player.chakra    = player.maxChakra;
    gained++;
  }
  return gained;
}

// ── Sub-handlers ──────────────────────────────────────────────────────────────

/** Start a brand-new hunt, pick a random enemy, store session. */
async function startHunt(sock, jid, msg, sender, player) {
  if (player.hp <= 0) {
    return sock.sendMessage(jid, {
      text: `❤️ You have 0 HP — rest before hunting again!\n_(Your HP regenerates over time.)_`
    }, { quoted: msg });
  }

  // Pick an enemy appropriate for the player's level
  const pool  = enemies.filter(e => e.level <= player.level + 10 && e.level >= Math.max(1, player.level - 5));
  const enemy = random(pool.length ? pool : enemies.slice(0, 3));
  if (!enemy) return sock.sendMessage(jid, { text: "⚠️ No enemies found for your level." }, { quoted: msg });

  const p    = playerSnap(player);
  const e    = enemySnap(enemy);
  const hunt = { jid: sender, chatJid: jid, p, e, round: 1, _timer: null };

  createHunt(sender, hunt);
  armHuntTimer(hunt, async () => {
    deleteHunt(sender);
    sock.sendMessage(jid, { text: `⏰ *Hunt timed out!* You fled from *${e.name}* due to inactivity.` }).catch(() => {});
  });

  const openMsg = [
    `🗾 *A wild enemy appears!*`,
    ``,
    `👹 *${e.name}* (Lv ${e.level}) blocks your path!`,
    `⚔️ ATK: ${e.attack}  🛡️ DEF: ${e.defense}  ⚡ SPD: ${e.speed}`,
    ``,
    buildMenu(hunt),
  ].join("\n");

  return sendWithEnemyImage(sock, jid, msg, openMsg, e.name);
}

/** Victory — award XP, ryo, possible drop, save player. */
async function handleVictory(sock, jid, msg, sender, player, hunt, actionLog) {
  const { p, e } = hunt;
  deleteHunt(sender);

  const xpGained  = calcXP(e.xpReward, hunt.round, e.level, player.level);
  const ryoGained = e.ryoReward;
  const drop      = rollDrop();

  player.xp    += xpGained;
  player.ryo   += ryoGained;
  player.wins   = (player.wins || 0) + 1;
  player.hp     = Math.max(1, p.hp);
  player.chakra = Math.max(0, p.chakra);

  const levelsGained = applyLevelUps(player);

  // Drop item
  if (drop) {
    player.inventory = p.inventory; // apply in-battle consumption first
    const existing = player.inventory.find(i => i.id === drop.id);
    if (existing) existing.amount = (existing.amount || 1) + 1;
    else player.inventory.push({ id: drop.id, amount: 1 });
  } else {
    player.inventory = p.inventory;
  }

  await player.save();

  const lines = [
    `🏆 *VICTORY!*`,
    ``,
    `👹 Defeated *${e.name}* (Lv ${e.level}) in *${hunt.round}* round${hunt.round > 1 ? "s" : ""}!`,
    ``,
    actionLog,
    ``,
    `🎁 *Rewards*`,
    `✨ XP: +${xpGained}${hunt.round > 1 ? ` _(+${xpGained - e.xpReward} round bonus)_` : ""}`,
    `💰 Ryo: +${ryoGained}`,
    drop  ? `📦 *Item Drop:* ${drop.name}!` : null,
    levelsGained > 0 ? `🎉 *LEVEL UP ×${levelsGained}!* You are now *Lv ${player.level}*!` : null,
    ``,
    `❤️ HP: ${player.hp}/${player.maxHp}`,
    `💙 Chakra: ${player.chakra}/${player.maxChakra}`,
    `🏆 Wins: ${player.wins}`,
  ].filter(l => l !== null).join("\n");

  return sendWithEnemyImage(sock, jid, msg, lines, e.name);
}

/** Defeat — revive at 25% HP, save player. */
async function handleDefeat(sock, jid, msg, sender, player, hunt, actionLog, enemyLog) {
  const { p, e } = hunt;
  deleteHunt(sender);

  player.losses    = (player.losses || 0) + 1;
  player.hp        = Math.max(1, Math.floor(player.maxHp * 0.25));
  player.chakra    = Math.max(0, p.chakra);
  player.inventory = p.inventory;

  await player.save();

  const lines = [
    `☠️ *DEFEATED!*`,
    ``,
    `👹 *${e.name}* (Lv ${e.level}) overwhelmed you in round ${hunt.round}!`,
    ``,
    actionLog,
    enemyLog || null,
    ``,
    `A passing ninja carried you to safety.`,
    `❤️ HP: ${player.hp}/${player.maxHp} _(revived at 25%)_`,
    `☠️ Losses: ${player.losses}`,
  ].filter(l => l !== null).join("\n");

  return sendWithEnemyImage(sock, jid, msg, lines, e.name);
}

// ── Main export ───────────────────────────────────────────────────────────────

export default {
  name:        "nhunt",
  description: "Fight enemies in turn-based PvE battles",
  category:    "naruto",
  usage:       ".nhunt | .nhunt attack | .nhunt jutsu <n> | .nhunt item <id> | .nhunt flee",
  cooldown:    5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args?.[0] || "").toLowerCase();

    try {
      const player = await players.get(sender);
      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse *.nstart* first."
        }, { quoted: msg });
      }

      const hunt = getHunt(sender);

      // ── No active battle ─────────────────────────────────────────────────
      if (!hunt) {
        if (sub && sub !== "start") {
          return sock.sendMessage(jid, {
            text: `⚔️ You're not in a hunt!\n\nUse *.nhunt* to find an enemy first.`
          }, { quoted: msg });
        }
        return startHunt(sock, jid, msg, sender, player);
      }

      // ── Active battle — show status if no sub ────────────────────────────
      if (!sub) {
        return sock.sendMessage(jid, { text: buildMenu(hunt) }, { quoted: msg });
      }

      const { p, e } = hunt;
      let actionLog  = "";

      // ── FLEE ─────────────────────────────────────────────────────────────
      if (sub === "flee") {
        deleteHunt(sender);
        const ryoLoss = Math.floor((player.ryo || 0) * 0.05);
        const hpLoss  = Math.floor(p.maxHp * 0.10);
        player.ryo    = Math.max(0, player.ryo - ryoLoss);
        player.hp     = Math.max(1, p.hp - hpLoss);
        player.chakra = Math.max(0, p.chakra);
        player.inventory = p.inventory;
        await player.save();

        return sock.sendMessage(jid, {
          text: [
            `🏃 *You fled from ${e.name}!*`,
            ``,
            `💸 Penalty: -${ryoLoss} Ryo`,
            `❤️ Penalty: -${hpLoss} HP from the scramble`,
            ``,
            `❤️ HP: ${player.hp}/${player.maxHp}`,
            `💰 Ryo: ${player.ryo}`,
          ].join("\n")
        }, { quoted: msg });
      }

      // ── ATTACK ───────────────────────────────────────────────────────────
      if (sub === "attack") {
        actionLog = doAttack(p, e);

      // ── JUTSU ────────────────────────────────────────────────────────────
      } else if (sub === "jutsu") {
        const idx = parseInt(args?.[1], 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= p.jutsu.length) {
          const list = p.jutsu.length
            ? p.jutsu.map((j, i) => `${i + 1}. ${j.name}`).join("\n")
            : "_(No jutsu learned — use .nlearn)_";
          return sock.sendMessage(jid, {
            text: `❓ Which jutsu? Use *.nhunt jutsu <number>*\n\n${list}`
          }, { quoted: msg });
        }
        const result = doJutsu(p, e, p.jutsu[idx]);
        if (result.error) return sock.sendMessage(jid, { text: result.error }, { quoted: msg });
        actionLog = result.msg;

      // ── ITEM ─────────────────────────────────────────────────────────────
      } else if (sub === "item") {
        const itemId = args?.[1];
        if (!itemId) {
          return sock.sendMessage(jid, {
            text: `❓ Which item? Use *.nhunt item <id>*\n\nCheck your bag: *.ninventory*`
          }, { quoted: msg });
        }
        const invIdx = p.inventory.findIndex(i => i.id === itemId);
        if (invIdx === -1) {
          return sock.sendMessage(jid, { text: `❌ You don't have \`${itemId}\` in your bag.` }, { quoted: msg });
        }
        const itemDef = itemsLib.find(i => i.id === itemId);
        if (!itemDef || !["consumable", "battle", "boost"].includes(itemDef.type)) {
          return sock.sendMessage(jid, {
            text: `❌ *${itemDef?.name || itemId}* can't be used in battle.`
          }, { quoted: msg });
        }

        const effects = [];
        if (itemDef.effect?.hp) {
          const healed = Math.min(itemDef.effect.hp, p.maxHp - p.hp);
          p.hp = Math.min(p.maxHp, p.hp + itemDef.effect.hp);
          effects.push(`❤️ +${healed} HP (${p.hp}/${p.maxHp})`);
        }
        if (itemDef.effect?.chakra) {
          const restored = Math.min(itemDef.effect.chakra, p.maxChakra - p.chakra);
          p.chakra = Math.min(p.maxChakra, p.chakra + itemDef.effect.chakra);
          effects.push(`💙 +${restored} Chakra (${p.chakra}/${p.maxChakra})`);
        }
        if (itemDef.attackBoost) {
          p.boosts.attack = { amount: itemDef.attackBoost, turns: itemDef.boostTurns || 3 };
          effects.push(`⚔️ +${itemDef.attackBoost} ATK for ${itemDef.boostTurns || 3} turns`);
        }
        if (itemDef.defenseBoost) {
          p.boosts.defense = { amount: itemDef.defenseBoost, turns: itemDef.boostTurns || 3 };
          effects.push(`🛡️ +${itemDef.defenseBoost} DEF for ${itemDef.boostTurns || 3} turns`);
        }
        if (itemDef.speedBoost) {
          p.boosts.speed = { amount: itemDef.speedBoost, turns: itemDef.boostTurns || 2 };
          effects.push(`⚡ +${itemDef.speedBoost} SPD for ${itemDef.boostTurns || 2} turns`);
        }
        if (itemDef.damage) {
          e.hp -= itemDef.damage;
          effects.push(`💥 Dealt ${itemDef.damage} damage to ${e.name}`);
        }

        // Consume one from stack
        p.inventory[invIdx].amount = (p.inventory[invIdx].amount || 1) - 1;
        if (p.inventory[invIdx].amount <= 0) p.inventory.splice(invIdx, 1);

        actionLog = `🎒 Used *${itemDef.name}*!\n${effects.join("\n")}`;

      } else {
        return sock.sendMessage(jid, {
          text: `❓ Unknown action.\n\n*.nhunt attack* / *.nhunt jutsu <n>* / *.nhunt item <id>* / *.nhunt flee*`
        }, { quoted: msg });
      }

      // ── Check enemy defeated ─────────────────────────────────────────────
      if (e.hp <= 0) {
        return handleVictory(sock, jid, msg, sender, player, hunt, actionLog);
      }

      // ── Enemy counter-attack ─────────────────────────────────────────────
      const enemyLog = doEnemyTurn(e, p);

      // ── Check player defeated after enemy attack ─────────────────────────
      if (p.hp <= 0) {
        return handleDefeat(sock, jid, msg, sender, player, hunt, actionLog, enemyLog);
      }

      // ── Both alive — advance round ───────────────────────────────────────
      tickTurn(p);
      hunt.round++;

      // Re-arm inactivity timer
      armHuntTimer(hunt, async () => {
        deleteHunt(sender);
        sock.sendMessage(jid, {
          text: `⏰ *Hunt timed out!* You fled from *${e.name}* due to inactivity.`
        }).catch(() => {});
      });

      const roundResult = [
        `⚔️ *Round ${hunt.round - 1} Result*`,
        ``,
        actionLog,
        enemyLog,
        ``,
        buildMenu(hunt),
      ].join("\n");

      return sock.sendMessage(jid, { text: roundResult }, { quoted: msg });

    } catch (err) {
      console.error("NHUNT ERROR:", err);
      deleteHunt(sender); // clean up broken state
      return sock.sendMessage(jid, { text: "❌ Hunt error. Your battle has been reset." }, { quoted: msg });
    }
  },
};
