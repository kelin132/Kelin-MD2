// plugins/naruto/nbattle.js
// Pokémon-style turn-based PvP battle system.
//
// Each action fires SEPARATE messages so the chat feels like a real battle:
//   1. Move announcement  — "Naruto used Shadow Clone Jutsu!"
//   2. Battle image       — canvas with portraits + HP bars + damage callout
//   3. Turn prompt        — "What will @opponent do?" (or end-of-battle card)

import players  from '../../lib/naruto/players.js';
import jutsuLib from '../../lib/jutsu.js';
import itemsLib from '../../lib/items.js';
import { chance, healthBar, chakraBar } from '../../lib/naruto/utils.js';
import {
  createBattle, getBattle, deleteBattle, getBattleByPlayer, armTimer,
} from '../../lib/battleState.mjs';
import { getClanImage } from '../../lib/narutoAPI.mjs';
import { generateBattleScene, generateResultScene } from '../../lib/battleCanvas.mjs';

// ─── helpers ─────────────────────────────────────────────────────────────────

const tag = (jid) => `@${jid.split('@')[0]}`;

/** Compute damage without a hidden inner crit so we can surface it ourselves. */
function calcDamage(attacker, defender, skill = null) {
  const raw = Math.max(1, Math.floor(
    attacker.attack + (skill?.damage || 0) - defender.defense / 2
  ));
  const crit   = chance(10);
  const damage = crit ? raw * 2 : raw;
  return { damage, crit };
}

function hpBar(current, max)     { return healthBar(Math.max(0, current), max, 10); }
function chakLine(c)             { return `💙 ${chakraBar(Math.max(0, c.chakra), c.maxChakra, 8)} ${c.chakra}/${c.maxChakra}`; }

/** Two-line HP status shown after every move. */
function statusBlock(battle) {
  const { challenger: c, opponent: o } = battle;
  return [
    `❤️ ${tag(c.jid)}: *${Math.max(0, c.hp)}/${c.maxHp}* ${hpBar(c.hp, c.maxHp)}`,
    `❤️ ${tag(o.jid)}: *${Math.max(0, o.hp)}/${o.maxHp}* ${hpBar(o.hp, o.maxHp)}`,
  ].join('\n');
}

/** Full jutsu list shown when player types .nbattle jutsu (no number). */
function buildJutsuList(mover) {
  const lines = [`🌀 *Jutsu List — ${tag(mover.jid)}*`, ``];
  if (!mover.jutsu.length) {
    lines.push(`_(No jutsu learned — use .nlearn)_`);
  } else {
    mover.jutsu.forEach((j, i) => {
      const cd       = mover.cooldowns[j.id] || 0;
      const noChakra = mover.chakra < j.chakra;
      if (cd > 0)        lines.push(`🔒 *.nbattle jutsu ${i + 1}* — ${j.name}  _(cooldown: ${cd})_`);
      else if (noChakra) lines.push(`⚠️ *.nbattle jutsu ${i + 1}* — ${j.name}  _(need ${j.chakra}💙)_`);
      else               lines.push(`🌀 *.nbattle jutsu ${i + 1}* — ${j.name}  [${j.damage || 0} dmg | ${j.chakra}💙]`);
    });
  }
  lines.push(``, `💙 Chakra: ${mover.chakra}/${mover.maxChakra}`);
  return lines.join('\n');
}

/** Full item list shown when player types .nbattle item (no ID). */
function buildItemList(mover) {
  const usable = (mover.inventory || []).filter(inv => {
    const d = itemsLib.find(x => x.id === inv.id);
    return d && (d.type === 'consumable' || d.type === 'battle');
  });
  const lines = [`🎒 *Item Bag — ${tag(mover.jid)}*`, ``];
  if (!usable.length) {
    lines.push(`_(No usable items in your bag)_`);
  } else {
    usable.forEach(inv => {
      const d = itemsLib.find(x => x.id === inv.id);
      lines.push(`  • *${d.name}* ×${inv.amount || 1}  → \`.nbattle item ${inv.id}\``);
    });
  }
  return lines.join('\n');
}

/** "What will X do?" compact prompt — use .nbattle jutsu / .nbattle item to expand. */
function buildPrompt(battle, mover) {
  const jutsuCount = mover.jutsu.length;
  const usableItems = (mover.inventory || []).filter(inv => {
    const d = itemsLib.find(x => x.id === inv.id);
    return d && (d.type === 'consumable' || d.type === 'battle');
  });

  const lines = [
    `━━━━━━━━━━━━━━━━━━━━`,
    `⚔️ *Round ${battle.round} — What will ${tag(mover.jid)} do?*`,
    ``,
    `🥊 *.nbattle attack* — Basic Attack`,
    `🌀 *.nbattle jutsu* — View Jutsu (${jutsuCount} move${jutsuCount !== 1 ? 's' : ''})`,
    `🎒 *.nbattle item* — View Items (${usableItems.length} usable)`,
    ``,
    `🏃 *.nbattle flee* — Give up`,
    `⏳ 2 minutes to respond or battle auto-cancels.`,
  ];
  return lines.join('\n');
}

function tickCooldowns(c) {
  for (const id of Object.keys(c.cooldowns)) {
    if (--c.cooldowns[id] <= 0) delete c.cooldowns[id];
  }
}

/** Build combatant snapshot from a DB player doc. */
async function snap(doc) {
  const jutsu = (doc.jutsu || [])
    .map(j => {
      const id = typeof j === 'string' ? j : j.id;
      return jutsuLib.find(x => x.id === id);
    })
    .filter(Boolean);

  const imageUrl = await getClanImage(doc.clan?.name, 'battle').catch(() => null);

  return {
    jid:       doc.jid,
    username:  doc.username,
    level:     doc.level,
    rank:      doc.rank,
    clan:      doc.clan?.name || null,
    imageUrl,
    hp:        doc.hp,
    maxHp:     doc.maxHp,
    chakra:    doc.chakra,
    maxChakra: doc.maxChakra,
    attack:    doc.attack,
    defense:   doc.defense,
    speed:     doc.speed,
    jutsu,
    inventory: JSON.parse(JSON.stringify(doc.inventory || [])),
    cooldowns: {},
  };
}

// ─── canvas senders ──────────────────────────────────────────────────────────

async function sendBattleImage(sock, gid, battle, caption, opts = {}) {
  try {
    const buf = await generateBattleScene({
      left:  battle.challenger,
      right: battle.opponent,
      round: battle.round,
      ...opts,
    });
    return sock.sendMessage(gid, { image: buf, caption, mentions: opts.mentions });
  } catch (err) {
    console.error('[nbattle] canvas error:', err.message);
    return sock.sendMessage(gid, { text: caption, mentions: opts.mentions });
  }
}

async function sendResultImage(sock, gid, { winner, loser, rewardText, outcome, caption, mentions }) {
  try {
    const buf = await generateResultScene({ winner, loser, rewardText, outcome });
    return sock.sendMessage(gid, { image: buf, caption, mentions });
  } catch (err) {
    console.error('[nbattle] result canvas error:', err.message);
    return sock.sendMessage(gid, { text: caption, mentions });
  }
}

// ─── end battle ──────────────────────────────────────────────────────────────

async function endBattle(sock, battle, winnerKey) {
  const loserKey = winnerKey === 'challenger' ? 'opponent' : 'challenger';
  const winner   = battle[winnerKey];
  const loser    = battle[loserKey];
  const gid      = battle.groupJid;

  const [xpResult] = await Promise.all([
    players.addXP(winner.jid, 150),
    players.addRyo(winner.jid, 300),
    players.update(loser.jid, { $inc: { losses: 1 } }),
  ]);

  let rewardText = '💰 +300 Ryo   ✨ +150 XP';
  if (xpResult?.rankedUp)    rewardText += `\n🎊 RANK UP → ${xpResult.newRank}!`;
  else if (xpResult?.leveledUp) rewardText += `\n⬆️ Level Up → ${xpResult.player?.level}!`;

  await sendResultImage(sock, gid, {
    winner: { username: winner.username, imageUrl: winner.imageUrl },
    loser:  { username: loser.username,  imageUrl: loser.imageUrl },
    rewardText,
    outcome: 'victory',
    caption: [
      `💀 *${tag(loser.jid)}* has been reduced to *0 HP!*`,
      ``,
      `🏆 *${tag(winner.jid)}* wins the battle!`,
      ``,
      rewardText,
    ].join('\n'),
    mentions: [winner.jid, loser.jid],
  });

  deleteBattle(gid);
}

// ─── plugin ──────────────────────────────────────────────────────────────────

export default {
  name:        'nbattle',
  description: 'Pokémon-style turn-based ninja PvP battle',
  category:    'naruto',
  usage:       '.nbattle @user | accept | attack | jutsu [n] | item [id] | flee',

  async run({ sock, msg, sender, text }) {
    const gid  = msg.key.remoteJid;
    const args = (text || '').trim().split(/\s+/);
    const cmd  = args[0]?.toLowerCase();

    const ctxInfo      = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = ctxInfo.mentionedJid?.[0];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHALLENGE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (mentionedJid && !['accept','attack','jutsu','item','flee'].includes(cmd)) {
      if (sender === mentionedJid)
        return sock.sendMessage(gid, { text: `❌ You can't battle yourself.` }, { quoted: msg });
      if (getBattle(gid))
        return sock.sendMessage(gid, { text: `⚔️ A battle is already underway here!` }, { quoted: msg });
      if (getBattleByPlayer(sender) || getBattleByPlayer(mentionedJid))
        return sock.sendMessage(gid, { text: `❌ One of you is already in a battle.` }, { quoted: msg });

      const [cDoc, oDoc] = await Promise.all([players.get(sender), players.get(mentionedJid)]);
      if (!cDoc) return sock.sendMessage(gid, { text: `🥷 You don't have a ninja profile.\nUse *.nstart* first.` }, { quoted: msg });
      if (!oDoc) return sock.sendMessage(gid, { text: `❌ That ninja hasn't registered yet.\nThey need to use *.nstart* first.` }, { quoted: msg });

      const [cSnap, oSnap] = await Promise.all([snap(cDoc), snap(oDoc)]);
      const battle = createBattle(gid, cSnap, oSnap);

      armTimer(battle, () => {
        if (getBattle(gid)?.status === 'pending') {
          deleteBattle(gid);
          sock.sendMessage(gid, {
            text: `⏰ Battle challenge from ${tag(sender)} expired — no response.`,
            mentions: [sender],
          });
        }
      });

      return sock.sendMessage(gid, {
        text: [
          `⚔️ *BATTLE CHALLENGE!*`,
          ``,
          `${tag(sender)} challenges ${tag(mentionedJid)} to a ninja duel!`,
          ``,
          `🎖️ ${tag(sender)}: Lv${cDoc.level} ${cDoc.rank}`,
          `🎖️ ${tag(mentionedJid)}: Lv${oDoc.level} ${oDoc.rank}`,
          ``,
          `📊 ${tag(sender)}: ATK ${cDoc.attack} | DEF ${cDoc.defense} | SPD ${cDoc.speed}`,
          `📊 ${tag(mentionedJid)}: ATK ${oDoc.attack} | DEF ${oDoc.defense} | SPD ${oDoc.speed}`,
          ``,
          `${tag(mentionedJid)} type *.nbattle accept* to begin!`,
          `⏳ Challenge expires in 2 minutes.`,
        ].join('\n'),
        mentions: [sender, mentionedJid],
      }, { quoted: msg });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ACCEPT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cmd === 'accept') {
      const battle = getBattle(gid);
      if (!battle)                        return sock.sendMessage(gid, { text: `❌ No pending battle here.` }, { quoted: msg });
      if (battle.status === 'active')     return sock.sendMessage(gid, { text: `⚔️ Battle is already in progress!` }, { quoted: msg });
      if (battle.opponent.jid !== sender) return sock.sendMessage(gid, { text: `❌ You weren't challenged.` }, { quoted: msg });

      battle.status = 'active';
      battle.round  = 1;
      battle.turn   = battle.challenger.speed >= battle.opponent.speed ? 'challenger' : 'opponent';

      const first = battle[battle.turn];
      const c = battle.challenger;
      const o = battle.opponent;

      // Arm inactivity timer
      armTimer(battle, async () => {
        if (!getBattle(gid)) return;
        await sock.sendMessage(gid, { text: `⏰ ${tag(first.jid)} took too long — battle cancelled!`, mentions: [first.jid] });
        deleteBattle(gid);
      });

      // 1️⃣ Opening battle card image
      await sendBattleImage(sock, gid, battle,
        [
          `⚔️ *A BATTLE BEGINS!*`,
          ``,
          `${tag(c.jid)}  VS  ${tag(o.jid)}`,
        ].join('\n'),
        { mentions: [c.jid, o.jid] }
      );

      // 2️⃣ HP status
      await sock.sendMessage(gid, {
        text: [
          `❤️ ${tag(c.jid)}: *${c.hp}/${c.maxHp}* HP  ${hpBar(c.hp, c.maxHp)}`,
          chakLine(c),
          ``,
          `❤️ ${tag(o.jid)}: *${o.hp}/${o.maxHp}* HP  ${hpBar(o.hp, o.maxHp)}`,
          chakLine(o),
        ].join('\n'),
        mentions: [c.jid, o.jid],
      });

      // 3️⃣ "Goes first" announce + action prompt
      await sock.sendMessage(gid, {
        text: `⚡ *${tag(first.jid)}* goes first! _(highest speed)_`,
        mentions: [first.jid],
      });

      return sock.sendMessage(gid, { text: buildPrompt(battle, first), mentions: [first.jid] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MOVE COMMANDS (need an active battle)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const battle = getBattle(gid);

    if (!battle || battle.status !== 'active') {
      return sock.sendMessage(gid, {
        text: [
          `⚔️ *NINJA BATTLE*`,
          ``,
          `No active battle here.`,
          `• *.nbattle @user* — challenge someone`,
          `• *.nbattle accept* — accept a challenge`,
        ].join('\n'),
      }, { quoted: msg });
    }

    const moverKey  = battle.turn;
    const targetKey = moverKey === 'challenger' ? 'opponent' : 'challenger';
    const mover     = battle[moverKey];
    const target    = battle[targetKey];

    if (mover.jid !== sender) {
      return sock.sendMessage(gid, {
        text: `⏳ It's *${tag(mover.jid)}'s* turn! Please wait.`,
        mentions: [mover.jid],
      }, { quoted: msg });
    }

    // ─── Shared: called after any damaging move ───────────────────────────────
    //
    // Pokémon sequence:
    //   msg 1 — plain text move announcement
    //   msg 2 — battle image (HP bars + damage callout + result caption)
    //   msg 3 — next player's action prompt  OR  end-of-battle card
    //
    async function afterDamage(announcement, damage, crit = false) {
      tickCooldowns(mover);
      battle.round++;
      battle.turn = targetKey;

      const hitSide = targetKey === 'challenger' ? 'left' : 'right';
      const dmgRnd  = Math.round(damage);

      // 1️⃣ Move announcement
      await sock.sendMessage(gid, {
        text: announcement,
        mentions: [mover.jid, target.jid],
      });

      // 2️⃣ Battle image with damage callout
      const resultCaption = [
        crit ? `✨ *Critical hit!*  💥 *${dmgRnd}* damage!` : `💥 *${dmgRnd}* damage dealt!`,
        ``,
        statusBlock(battle),
      ].join('\n');

      await sendBattleImage(sock, gid, battle, resultCaption, {
        hitSide,
        damage: dmgRnd,
        crit,
        mentions: [mover.jid, target.jid],
      });

      // 3️⃣a Battle over → end card
      if (target.hp <= 0) return endBattle(sock, battle, moverKey);

      // 3️⃣b Battle continues → next player's prompt
      const next = battle[battle.turn];
      armTimer(battle, async () => {
        if (!getBattle(gid)) return;
        await sock.sendMessage(gid, {
          text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`,
          mentions: [next.jid],
        });
        deleteBattle(gid);
      });
      return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ATTACK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cmd === 'attack') {
      const { damage, crit } = calcDamage(mover, target);
      target.hp -= damage;
      return afterDamage(
        `🥊 *${tag(mover.jid)}* throws a *Basic Attack* at *${tag(target.jid)}*!`,
        damage, crit
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // JUTSU
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cmd === 'jutsu') {
      const num = parseInt(args[1], 10);

      // No number → show the full jutsu list
      if (!args[1] || isNaN(num)) {
        return sock.sendMessage(gid, { text: buildJutsuList(mover), mentions: [mover.jid] }, { quoted: msg });
      }

      const jutsu = mover.jutsu[num - 1];

      if (!jutsu)
        return sock.sendMessage(gid, { text: `❌ Invalid jutsu number. Pick 1–${mover.jutsu.length}.` }, { quoted: msg });
      if ((mover.cooldowns[jutsu.id] || 0) > 0)
        return sock.sendMessage(gid, { text: `🔒 *${jutsu.name}* is on cooldown for *${mover.cooldowns[jutsu.id]}* more turn(s).` }, { quoted: msg });
      if (mover.chakra < jutsu.chakra)
        return sock.sendMessage(gid, { text: `💙 Not enough chakra!\n*${jutsu.name}* needs ${jutsu.chakra} — you have ${mover.chakra}.` }, { quoted: msg });

      mover.chakra -= jutsu.chakra;
      if (jutsu.cooldown) mover.cooldowns[jutsu.id] = jutsu.cooldown;

      // ── Miss check ──
      if (jutsu.accuracy < 100 && Math.random() * 100 >= jutsu.accuracy) {
        tickCooldowns(mover);
        battle.round++;
        battle.turn = targetKey;
        const next  = battle[battle.turn];

        // 1️⃣ Announcement
        await sock.sendMessage(gid, {
          text: `🌀 *${tag(mover.jid)}* unleashes *${jutsu.name}*!`,
          mentions: [mover.jid],
        });

        // 2️⃣ Miss result
        await sock.sendMessage(gid, {
          text: [`💨 *But it missed!*`, ``, statusBlock(battle)].join('\n'),
          mentions: [mover.jid, target.jid],
        });

        // 3️⃣ Next prompt
        armTimer(battle, async () => {
          if (!getBattle(gid)) return;
          await sock.sendMessage(gid, { text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`, mentions: [next.jid] });
          deleteBattle(gid);
        });
        return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
      }

      // ── Hit ──
      const { damage, crit } = calcDamage(mover, target, jutsu);
      target.hp -= damage;
      return afterDamage(
        `🌀 *${tag(mover.jid)}* unleashes *${jutsu.name}*!`,
        damage, crit
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ITEM
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cmd === 'item') {
      const itemId = args[1];

      // No ID → show the full item list
      if (!itemId) {
        return sock.sendMessage(gid, { text: buildItemList(mover), mentions: [mover.jid] }, { quoted: msg });
      }

      const invIdx = (mover.inventory || []).findIndex(i => i.id === itemId);
      if (invIdx === -1)
        return sock.sendMessage(gid, { text: `❌ You don't have *${itemId}* in your bag.` }, { quoted: msg });

      const def = itemsLib.find(x => x.id === itemId);
      if (!def || !['consumable', 'battle'].includes(def.type))
        return sock.sendMessage(gid, { text: `❌ *${itemId}* can't be used in battle.` }, { quoted: msg });

      // Deduct from snapshot
      mover.inventory[invIdx].amount = (mover.inventory[invIdx].amount || 1) - 1;
      if (mover.inventory[invIdx].amount <= 0) mover.inventory.splice(invIdx, 1);

      // Deduct from DB
      const playerDoc = await players.get(sender);
      if (playerDoc) {
        const dbIdx = (playerDoc.inventory || []).findIndex(i => i.id === itemId);
        if (dbIdx !== -1) {
          playerDoc.inventory[dbIdx].amount = (playerDoc.inventory[dbIdx].amount || 1) - 1;
          if (playerDoc.inventory[dbIdx].amount <= 0) playerDoc.inventory.splice(dbIdx, 1);
          await playerDoc.save();
        }
      }

      // ── Consumable: heal self, costs a turn ──
      if (def.type === 'consumable') {
        const effects = [];
        if (def.effect?.hp) {
          const healed = Math.min(def.effect.hp, mover.maxHp - mover.hp);
          mover.hp     = Math.min(mover.maxHp, mover.hp + def.effect.hp);
          effects.push(`❤️ Restored *${healed} HP* → ${mover.hp}/${mover.maxHp}  ${hpBar(mover.hp, mover.maxHp)}`);
        }
        if (def.effect?.chakra) {
          const restored = Math.min(def.effect.chakra, mover.maxChakra - mover.chakra);
          mover.chakra   = Math.min(mover.maxChakra, mover.chakra + def.effect.chakra);
          effects.push(`💙 Restored *${restored} Chakra* → ${mover.chakra}/${mover.maxChakra}`);
        }

        tickCooldowns(mover);
        battle.round++;
        battle.turn = targetKey;
        const next  = battle[battle.turn];

        // 1️⃣ Item announcement
        await sock.sendMessage(gid, {
          text: `🎒 *${tag(mover.jid)}* used *${def.name}*!`,
          mentions: [mover.jid],
        });

        // 2️⃣ Effect result
        await sock.sendMessage(gid, {
          text: [effects.join('\n'), ``, statusBlock(battle)].join('\n'),
          mentions: [mover.jid, target.jid],
        });

        // 3️⃣ Next prompt
        armTimer(battle, async () => {
          if (!getBattle(gid)) return;
          await sock.sendMessage(gid, { text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`, mentions: [next.jid] });
          deleteBattle(gid);
        });
        return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
      }

      // ── Battle item: deals damage ──
      if (def.type === 'battle') {
        const damage = def.damage || 0;
        target.hp -= damage;
        return afterDamage(
          `💣 *${tag(mover.jid)}* hurls a *${def.name}* at *${tag(target.jid)}*!`,
          damage
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FLEE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cmd === 'flee') {
      // 1️⃣ Flee announcement
      await sock.sendMessage(gid, {
        text: `🏃 *${tag(mover.jid)}* is trying to flee from the battle!`,
        mentions: [mover.jid],
      });

      // Reward the opponent
      const [xpResult] = await Promise.all([
        players.addXP(target.jid, 75),
        players.addRyo(target.jid, 150),
        players.update(sender, { $inc: { losses: 1 } }),
      ]);

      let rewardText = '💰 +150 Ryo   ✨ +75 XP';
      if (xpResult?.rankedUp)    rewardText += `\n🎊 RANK UP → ${xpResult.newRank}!`;
      else if (xpResult?.leveledUp) rewardText += `\n⬆️ Level Up → ${xpResult.player?.level}!`;

      // 2️⃣ Result card
      await sendResultImage(sock, gid, {
        winner: { username: target.username, imageUrl: target.imageUrl },
        loser:  { username: mover.username,  imageUrl: mover.imageUrl },
        rewardText,
        outcome: 'flee',
        caption: [
          `🏳️ *${tag(mover.jid)}* fled the battle!`,
          `🏆 *${tag(target.jid)}* wins by default!`,
          ``,
          rewardText,
        ].join('\n'),
        mentions: [mover.jid, target.jid],
      });

      return deleteBattle(gid);
    }

    // Fallback — redisplay the current prompt
    return sock.sendMessage(gid, { text: buildPrompt(battle, mover), mentions: [mover.jid] }, { quoted: msg });
  },
};
