// plugins/naruto/nbattle.js
// Turn-based interactive PvP battle system

import players  from '../../lib/naruto/players.js';
import jutsuLib from '../../lib/jutsu.js';
import itemsLib from '../../lib/items.js';
import { calculateDamage, chance, healthBar } from '../../lib/naruto/utils.js';
import {
  createBattle, getBattle, deleteBattle, getBattleByPlayer, armTimer,
} from '../../lib/battleState.mjs';
import { getClanImage } from '../../lib/narutoAPI.mjs';
import { generateBattleScene, generateResultScene } from '../../lib/battleCanvas.mjs';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Short tag helper */
const tag = (jid) => `@${jid.split('@')[0]}`;

/** Build a battle-ready combatant snapshot from a DB player doc. */
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

/** Render + send the current battle scene as an image, with a text caption. */
async function sendBattleImage(sock, gid, battle, caption, opts = {}) {
  try {
    const buffer = await generateBattleScene({
      left:  battle.challenger,
      right: battle.opponent,
      round: battle.round,
      ...opts,
    });
    return sock.sendMessage(gid, {
      image: buffer,
      caption,
      mentions: opts.mentions,
    });
  } catch (err) {
    console.error('BATTLE CANVAS ERROR:', err);
    return sock.sendMessage(gid, { text: caption, mentions: opts.mentions });
  }
}

/** Render + send the win/loss result card as an image, with a text caption. */
async function sendResultImage(sock, gid, { winner, loser, rewardText, outcome, caption, mentions }) {
  try {
    const buffer = await generateResultScene({ winner, loser, rewardText, outcome });
    return sock.sendMessage(gid, { image: buffer, caption, mentions });
  } catch (err) {
    console.error('BATTLE RESULT CANVAS ERROR:', err);
    return sock.sendMessage(gid, { text: caption, mentions });
  }
}

/** One-line HP display with bar. */
function hpLine(c) {
  const hp = Math.max(0, c.hp);
  return `❤️ ${tag(c.jid)}: ${hp}/${c.maxHp} HP ${healthBar(hp, c.maxHp, 10)}`;
}

/** Decrement all jutsu cooldowns after a player's turn. */
function tickCooldowns(c) {
  for (const id of Object.keys(c.cooldowns)) {
    c.cooldowns[id]--;
    if (c.cooldowns[id] <= 0) delete c.cooldowns[id];
  }
}

/** Build the move-selection prompt for the current player. */
function buildPrompt(battle, mover) {
  const lines = [
    `⚔️ *BATTLE — Turn ${battle.round}*`,
    `─────────────────────`,
    hpLine(battle.challenger),
    hpLine(battle.opponent),
    ``,
    `🎯 ${tag(mover.jid)}, choose your action:`,
    ``,
    `🥊 *.nbattle attack* — Basic Attack`,
  ];

  mover.jutsu.forEach((j, i) => {
    const cd       = mover.cooldowns[j.id] || 0;
    const noChakra = mover.chakra < j.chakra;
    let icon, note;
    if (cd > 0)        { icon = '🔒'; note = ` ❌ cooldown: ${cd} turn(s)`; }
    else if (noChakra) { icon = '⚠️'; note = ` ⚠️ need ${j.chakra}💙 (have ${mover.chakra})`; }
    else               { icon = '🌀'; note = ` — ${j.damage} dmg, ${j.chakra}💙`; }
    lines.push(`${icon} *.nbattle jutsu ${i + 1}* — ${j.name}${note}`);
  });

  const usable = (mover.inventory || []).filter(inv => {
    const def = itemsLib.find(x => x.id === inv.id);
    return def && (def.type === 'consumable' || def.type === 'battle');
  });
  if (usable.length) {
    lines.push(``, `*🎒 Items (*.nbattle item <id>*):*`);
    usable.forEach(inv => {
      const def = itemsLib.find(x => x.id === inv.id);
      lines.push(`   • *${def.name}* ×${inv.amount || 1}  \`${inv.id}\``);
    });
  }

  lines.push(``, `🏃 *.nbattle flee* — Forfeit`);
  lines.push(``, `⏳ 2 minutes to respond or battle cancels.`);
  return lines.join('\n');
}

/** Announce battle end, save DB, clean up. */
async function endBattle(sock, battle, winnerKey) {
  const loserKey = winnerKey === 'challenger' ? 'opponent' : 'challenger';
  const winner   = battle[winnerKey];
  const loser    = battle[loserKey];
  const gid      = battle.groupJid;

  await sendResultImage(sock, gid, {
    winner: { username: winner.username, imageUrl: winner.imageUrl },
    loser:  { username: loser.username,  imageUrl: loser.imageUrl },
    rewardText: '💰 +300 Ryo | ✨ +100 XP',
    outcome: 'victory',
    caption: [
      `💀 ${tag(loser.jid)} has been reduced to *0 HP!*`,
      `🏆 ${tag(winner.jid)} wins the battle!`,
    ].join('\n'),
    mentions: [winner.jid, loser.jid],
  });

  const [winDoc, loseDoc] = await Promise.all([
    players.get(winner.jid),
    players.get(loser.jid),
  ]);
  if (winDoc)  { winDoc.wins    = (winDoc.wins    || 0) + 1; winDoc.xp  += 100; winDoc.ryo  += 300; await winDoc.save(); }
  if (loseDoc) { loseDoc.losses = (loseDoc.losses || 0) + 1; await loseDoc.save(); }

  deleteBattle(gid);
}

// ─── plugin ──────────────────────────────────────────────────────────────────

export default {
  name:        'nbattle',
  description: 'Turn-based ninja PvP battle',
  category:    'naruto',
  usage:       '.nbattle @user | accept | attack | jutsu <n> | item <id> | flee',

  async run({ sock, msg, sender, text }) {
    const gid  = msg.key.remoteJid;
    const args = (text || '').trim().split(/\s+/);
    const cmd  = args[0].toLowerCase();

    const ctx          = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = ctx.mentionedJid?.[0];

    // ── CHALLENGE ──────────────────────────────────────────────────────────────
    if (mentionedJid && !['accept','attack','jutsu','item','flee'].includes(cmd)) {
      if (sender === mentionedJid)
        return sock.sendMessage(gid, { text: `❌ You can't battle yourself.` }, { quoted: msg });

      if (getBattle(gid))
        return sock.sendMessage(gid, { text: `⚔️ A battle is already underway in this group!` }, { quoted: msg });

      if (getBattleByPlayer(sender) || getBattleByPlayer(mentionedJid))
        return sock.sendMessage(gid, { text: `❌ One of you is already in a battle.` }, { quoted: msg });

      const [cDoc, oDoc] = await Promise.all([players.get(sender), players.get(mentionedJid)]);

      if (!cDoc) return sock.sendMessage(gid, { text: `🥷 You don't have a ninja profile.\n\nUse *.nstart* first.` }, { quoted: msg });
      if (!oDoc) return sock.sendMessage(gid, { text: `❌ That ninja hasn't created a profile yet.\n\nThey need to use *.nstart* first.` }, { quoted: msg });

      const [cSnap, oSnap] = await Promise.all([snap(cDoc), snap(oDoc)]);
      const battle = createBattle(gid, cSnap, oSnap);

      armTimer(battle, () => {
        if (getBattle(gid)?.status === 'pending') {
          deleteBattle(gid);
          sock.sendMessage(gid, { text: `⏰ Battle challenge from ${tag(sender)} expired — no response.`, mentions: [sender] });
        }
      });

      return sock.sendMessage(gid, {
        text: [
          `⚔️ *BATTLE CHALLENGE!*`,
          ``,
          `${tag(sender)} challenges ${tag(mentionedJid)} to a ninja duel!`,
          ``,
          `${tag(mentionedJid)} type *.nbattle accept* to begin!`,
          `⏳ Challenge expires in 2 minutes.`,
        ].join('\n'),
        mentions: [sender, mentionedJid],
      }, { quoted: msg });
    }

    // ── ACCEPT ─────────────────────────────────────────────────────────────────
    if (cmd === 'accept') {
      const battle = getBattle(gid);
      if (!battle)                        return sock.sendMessage(gid, { text: `❌ No pending battle in this group.` }, { quoted: msg });
      if (battle.status === 'active')     return sock.sendMessage(gid, { text: `⚔️ Battle is already in progress!` }, { quoted: msg });
      if (battle.opponent.jid !== sender) return sock.sendMessage(gid, { text: `❌ You weren't challenged.` }, { quoted: msg });

      battle.status = 'active';
      battle.round  = 1;
      battle.turn   = battle.challenger.speed >= battle.opponent.speed ? 'challenger' : 'opponent';

      const first = battle[battle.turn];

      armTimer(battle, async () => {
        if (!getBattle(gid)) return;
        await sock.sendMessage(gid, { text: `⏰ ${tag(first.jid)} took too long — battle cancelled!`, mentions: [first.jid] });
        deleteBattle(gid);
      });

      await sendBattleImage(sock, gid, battle,
        [
          `⚔️ *NINJA BATTLE BEGINS!*`,
          ``,
          `🏃 Fastest ninja goes first — ${tag(first.jid)} attacks!`,
        ].join('\n'),
        { mentions: [battle.challenger.jid, battle.opponent.jid] }
      );

      return sock.sendMessage(gid, { text: buildPrompt(battle, first), mentions: [first.jid] });
    }

    // ── MOVE COMMANDS ──────────────────────────────────────────────────────────
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
        text: `⏳ It's ${tag(mover.jid)}'s turn! Wait for them to move.`,
        mentions: [mover.jid],
      }, { quoted: msg });
    }

    // Shared: called after every damaging move
    async function afterDamage(header, damage, crit = false) {
      tickCooldowns(mover);
      battle.turn = targetKey;
      battle.round++;

      const hitSide = targetKey === 'challenger' ? 'left' : 'right';

      await sendBattleImage(sock, gid, battle,
        [
          header,
          ``,
          `💥 ${tag(target.jid)} was dealt *${damage}* damage!`,
        ].join('\n'),
        { hitSide, damage, crit, mentions: [mover.jid, target.jid] }
      );

      if (target.hp <= 0) return endBattle(sock, battle, moverKey);

      const next = battle[battle.turn];
      armTimer(battle, async () => {
        if (!getBattle(gid)) return;
        await sock.sendMessage(gid, { text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`, mentions: [next.jid] });
        deleteBattle(gid);
      });
      return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
    }

    // ── ATTACK ─────────────────────────────────────────────────────────────────
    if (cmd === 'attack') {
      const damage = calculateDamage(mover, target, null);
      target.hp -= damage;
      return afterDamage(`🥊 ${tag(mover.jid)} throws a *Basic Attack* at ${tag(target.jid)}!`, damage);
    }

    // ── JUTSU ──────────────────────────────────────────────────────────────────
    if (cmd === 'jutsu') {
      const num   = parseInt(args[1], 10);
      const jutsu = mover.jutsu[num - 1];

      if (!jutsu || isNaN(num))
        return sock.sendMessage(gid, { text: `❌ Invalid jutsu number. Pick 1–${mover.jutsu.length}.` }, { quoted: msg });

      if ((mover.cooldowns[jutsu.id] || 0) > 0)
        return sock.sendMessage(gid, { text: `🔒 *${jutsu.name}* is on cooldown for *${mover.cooldowns[jutsu.id]}* more turn(s).` }, { quoted: msg });

      if (mover.chakra < jutsu.chakra)
        return sock.sendMessage(gid, { text: `💙 Not enough chakra for *${jutsu.name}*!\nNeeded: ${jutsu.chakra} | Yours: ${mover.chakra}` }, { quoted: msg });

      mover.chakra -= jutsu.chakra;
      if (jutsu.cooldown) mover.cooldowns[jutsu.id] = jutsu.cooldown;

      // Miss check
      if (jutsu.accuracy < 100 && Math.random() * 100 >= jutsu.accuracy) {
        tickCooldowns(mover);
        battle.turn = targetKey;
        battle.round++;
        const next = battle[battle.turn];
        armTimer(battle, async () => {
          if (!getBattle(gid)) return;
          await sock.sendMessage(gid, { text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`, mentions: [next.jid] });
          deleteBattle(gid);
        });
        await sock.sendMessage(gid, {
          text: `💨 ${tag(mover.jid)} unleashed *${jutsu.name}*... but it *missed!* 💫\n💙 Chakra: ${mover.chakra}/${mover.maxChakra}`,
          mentions: [mover.jid],
        });
        return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
      }

      const crit   = chance(10);
      const base   = calculateDamage(mover, target, jutsu);
      const damage = crit ? base * 2 : base;
      target.hp -= damage;

      const header = [
        `🌀 ${tag(mover.jid)} unleashes *${jutsu.name}*!`,
        crit ? `✨ *CRITICAL HIT!*` : null,
      ].filter(Boolean).join('\n');

      return afterDamage(header, damage, crit);
    }

    // ── ITEM ───────────────────────────────────────────────────────────────────
    if (cmd === 'item') {
      const itemId = args[1];
      if (!itemId)
        return sock.sendMessage(gid, { text: `❌ Specify item ID.\nExample: *.nbattle item small_hp_potion*` }, { quoted: msg });

      const invIdx = (mover.inventory || []).findIndex(i => i.id === itemId);
      if (invIdx === -1)
        return sock.sendMessage(gid, { text: `❌ You don't have *${itemId}* in your bag.` }, { quoted: msg });

      const def = itemsLib.find(x => x.id === itemId);
      if (!def || !['consumable', 'battle'].includes(def.type))
        return sock.sendMessage(gid, { text: `❌ *${itemId}* can't be used in battle.` }, { quoted: msg });

      // Remove from snapshot
      mover.inventory[invIdx].amount = (mover.inventory[invIdx].amount || 1) - 1;
      if (mover.inventory[invIdx].amount <= 0) mover.inventory.splice(invIdx, 1);

      // Remove from DB
      const playerDoc = await players.get(sender);
      if (playerDoc) {
        const dbIdx = (playerDoc.inventory || []).findIndex(i => i.id === itemId);
        if (dbIdx !== -1) {
          playerDoc.inventory[dbIdx].amount = (playerDoc.inventory[dbIdx].amount || 1) - 1;
          if (playerDoc.inventory[dbIdx].amount <= 0) playerDoc.inventory.splice(dbIdx, 1);
          await playerDoc.save();
        }
      }

      // Consumable — heal self, use up turn
      if (def.type === 'consumable') {
        const effects = [];
        if (def.effect?.hp) {
          const healed = Math.min(def.effect.hp, mover.maxHp - mover.hp);
          mover.hp     = Math.min(mover.maxHp, mover.hp + def.effect.hp);
          effects.push(`❤️ Restored ${healed} HP → ${mover.hp}/${mover.maxHp} ${healthBar(mover.hp, mover.maxHp, 8)}`);
        }
        if (def.effect?.chakra) {
          const restored = Math.min(def.effect.chakra, mover.maxChakra - mover.chakra);
          mover.chakra   = Math.min(mover.maxChakra, mover.chakra + def.effect.chakra);
          effects.push(`💙 Restored ${restored} Chakra → ${mover.chakra}/${mover.maxChakra}`);
        }

        tickCooldowns(mover);
        battle.turn = targetKey;
        battle.round++;
        const next = battle[battle.turn];
        armTimer(battle, async () => {
          if (!getBattle(gid)) return;
          await sock.sendMessage(gid, { text: `⏰ ${tag(next.jid)} took too long — battle cancelled!`, mentions: [next.jid] });
          deleteBattle(gid);
        });
        await sock.sendMessage(gid, {
          text: `🎒 ${tag(mover.jid)} uses *${def.name}*!\n\n${effects.join('\n')}`,
          mentions: [mover.jid],
        });
        return sock.sendMessage(gid, { text: buildPrompt(battle, next), mentions: [next.jid] });
      }

      // Battle item — deal damage
      if (def.type === 'battle') {
        const damage = def.damage || 0;
        target.hp -= damage;
        return afterDamage(`💣 ${tag(mover.jid)} hurls a *${def.name}* at ${tag(target.jid)}!`, damage);
      }
    }

    // ── FLEE ───────────────────────────────────────────────────────────────────
    if (cmd === 'flee') {
      await sendResultImage(sock, gid, {
        winner: { username: target.username, imageUrl: target.imageUrl },
        loser:  { username: mover.username,  imageUrl: mover.imageUrl },
        rewardText: '💰 +150 Ryo | ✨ +50 XP',
        outcome: 'flee',
        caption: [
          `🏃 ${tag(mover.jid)} has fled the battle!`,
          `🏆 ${tag(target.jid)} wins by default!`,
        ].join('\n'),
        mentions: [mover.jid, target.jid],
      });

      const [winDoc, loseDoc] = await Promise.all([players.get(target.jid), players.get(sender)]);
      if (winDoc)  { winDoc.wins    = (winDoc.wins    || 0) + 1; winDoc.xp  += 50; winDoc.ryo  += 150; await winDoc.save(); }
      if (loseDoc) { loseDoc.losses = (loseDoc.losses || 0) + 1; await loseDoc.save(); }

      return deleteBattle(gid);
    }

    // Fallback — show current prompt again
    return sock.sendMessage(gid, { text: buildPrompt(battle, mover), mentions: [mover.jid] }, { quoted: msg });
  },
};
