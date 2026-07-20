// plugins/naruto/nbattle.js
// Turn-based interactive PvP battle system

import players  from '../../lib/naruto/players.js';
import jutsuLib from '../../lib/jutsu.js';
import itemsLib from '../../lib/items.js';
import { calculateDamage, chance, healthBar, chakraBar } from '../../lib/naruto/utils.js';
import {
  createBattle, getBattle, deleteBattle, getBattleByPlayer, armTimer,
} from '../../lib/battleState.mjs';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a battle-ready combatant snapshot from a DB player doc. */
function snap(doc) {
  // Resolve full jutsu definitions the player knows
  const jutsu = (doc.jutsu || [])
    .map(j => {
      const id = typeof j === 'string' ? j : j.id;
      return jutsuLib.find(x => x.id === id);
    })
    .filter(Boolean);

  return {
    jid:       doc.jid,
    username:  doc.username,
    hp:        doc.hp,
    maxHp:     doc.maxHp,
    chakra:    doc.chakra,
    maxChakra: doc.maxChakra,
    attack:    doc.attack,
    defense:   doc.defense,
    speed:     doc.speed,
    jutsu,
    inventory: JSON.parse(JSON.stringify(doc.inventory || [])), // deep copy
    cooldowns: {},  // jutsuId → turns remaining
  };
}

/** One-line HP display with coloured bar. */
function hpLine(c) {
  const hp = Math.max(0, c.hp);
  return `❤️ *${c.username}*: ${hp}/${c.maxHp} HP ${healthBar(hp, c.maxHp, 10)}`;
}

/** Decrement all jutsu cooldowns by 1 after a player's turn. */
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
    `🎯 @${mover.jid.split('@')[0]}, choose your action:`,
    ``,
    `🥊 *.nbattle attack* — Basic Attack`,
  ];

  // Jutsu list
  mover.jutsu.forEach((j, i) => {
    const cd       = mover.cooldowns[j.id] || 0;
    const noChakra = mover.chakra < j.chakra;
    let icon, note;

    if (cd > 0) {
      icon = '🔒'; note = ` ❌ cooldown: ${cd} turn(s)`;
    } else if (noChakra) {
      icon = '⚠️'; note = ` ⚠️ need ${j.chakra}💙 (have ${mover.chakra})`;
    } else {
      icon = '🌀'; note = ` — ${j.damage} dmg, ${j.chakra}💙`;
    }
    lines.push(`${icon} *.nbattle jutsu ${i + 1}* — ${j.name}${note}`);
  });

  // Battle-usable items
  const usable = (mover.inventory || []).filter(inv => {
    const def = itemsLib.find(x => x.id === inv.id);
    return def && (def.type === 'consumable' || def.type === 'battle');
  });

  if (usable.length) {
    lines.push(``, `*🎒 Items (use *.nbattle item <id>*):*`);
    usable.forEach(inv => {
      const def = itemsLib.find(x => x.id === inv.id);
      lines.push(`   • *${def.name}* ×${inv.amount || 1}  \`${inv.id}\``);
    });
  }

  lines.push(``, `🏃 *.nbattle flee* — Forfeit`);
  lines.push(``, `⏳ 2 minutes to respond or battle cancels.`);

  return lines.join('\n');
}

/** Announce battle end, update DB, clean up. */
async function endBattle(sock, battle, winnerKey) {
  const loserKey  = winnerKey === 'challenger' ? 'opponent' : 'challenger';
  const winner    = battle[winnerKey];
  const loser     = battle[loserKey];
  const groupJid  = battle.groupJid;

  // Final HP snapshot
  const finalBoard = [
    ``,
    hpLine(battle.challenger),
    hpLine(battle.opponent),
  ].join('\n');

  const caption = [
    `💀 @${loser.jid.split('@')[0]} has been reduced to *0 HP!*`,
    finalBoard,
    ``,
    `🏆 @${winner.jid.split('@')[0]} wins the battle!`,
    `💰 +300 Ryo | ✨ +100 XP`,
  ].join('\n');

  await sock.sendMessage(groupJid, {
    text: caption,
    mentions: [winner.jid, loser.jid],
  });

  // Persist results to DB
  const [winDoc, loseDoc] = await Promise.all([
    players.get(winner.jid),
    players.get(loser.jid),
  ]);
  if (winDoc) {
    winDoc.wins  = (winDoc.wins  || 0) + 1;
    winDoc.xp   += 100;
    winDoc.ryo  += 300;
    await winDoc.save();
  }
  if (loseDoc) {
    loseDoc.losses = (loseDoc.losses || 0) + 1;
    await loseDoc.save();
  }

  deleteBattle(groupJid);
}

// ─── plugin ──────────────────────────────────────────────────────────────────

export default {
  name:        'nbattle',
  description: 'Turn-based ninja PvP battle',
  category:    'naruto',
  usage:       '.nbattle @user | accept | attack | jutsu <n> | item <id> | flee',

  async run({ sock, msg, sender, text }) {
    const groupJid = msg.key.remoteJid;
    const args     = (text || '').trim().split(/\s+/);
    const cmd      = args[0].toLowerCase();

    const ctx          = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = ctx.mentionedJid?.[0];

    // ── CHALLENGE ──────────────────────────────────────────
    if (mentionedJid && !['accept','attack','jutsu','item','flee'].includes(cmd)) {
      if (sender === mentionedJid) {
        return sock.sendMessage(groupJid, { text: `❌ You can't battle yourself.` }, { quoted: msg });
      }

      if (getBattle(groupJid)) {
        return sock.sendMessage(groupJid, { text: `⚔️ A battle is already underway in this group!` }, { quoted: msg });
      }

      if (getBattleByPlayer(sender) || getBattleByPlayer(mentionedJid)) {
        return sock.sendMessage(groupJid, { text: `❌ One of you is already in a battle elsewhere.` }, { quoted: msg });
      }

      const [challengerDoc, opponentDoc] = await Promise.all([
        players.get(sender),
        players.get(mentionedJid),
      ]);

      if (!challengerDoc) {
        return sock.sendMessage(groupJid, { text: `🥷 You don't have a ninja profile yet.\n\nUse *.nstart* first.` }, { quoted: msg });
      }
      if (!opponentDoc) {
        return sock.sendMessage(groupJid, { text: `❌ That ninja hasn't started their journey yet.\n\nThey need to use *.nstart* first.` }, { quoted: msg });
      }

      const battle = createBattle(groupJid, snap(challengerDoc), snap(opponentDoc));

      // Auto-expire challenge after 2 min
      armTimer(battle, () => {
        if (getBattle(groupJid)?.status === 'pending') {
          deleteBattle(groupJid);
          sock.sendMessage(groupJid, {
            text: `⏰ Battle challenge from *${challengerDoc.username}* expired — no response.`,
          });
        }
      });

      return sock.sendMessage(groupJid, {
        text: [
          `⚔️ *BATTLE CHALLENGE!*`,
          ``,
          `@${sender.split('@')[0]} (*${challengerDoc.username}*) challenges @${mentionedJid.split('@')[0]} (*${opponentDoc.username}*) to a ninja duel!`,
          ``,
          `@${mentionedJid.split('@')[0]} type *.nbattle accept* to begin!`,
          `⏳ Challenge expires in 2 minutes.`,
        ].join('\n'),
        mentions: [sender, mentionedJid],
      }, { quoted: msg });
    }

    // ── ACCEPT ─────────────────────────────────────────────
    if (cmd === 'accept') {
      const battle = getBattle(groupJid);
      if (!battle)                         return sock.sendMessage(groupJid, { text: `❌ No pending battle in this group.` }, { quoted: msg });
      if (battle.status === 'active')      return sock.sendMessage(groupJid, { text: `⚔️ Battle is already in progress!` }, { quoted: msg });
      if (battle.opponent.jid !== sender)  return sock.sendMessage(groupJid, { text: `❌ You weren't challenged.` }, { quoted: msg });

      battle.status = 'active';
      battle.round  = 1;
      // Faster ninja strikes first
      battle.turn = battle.challenger.speed >= battle.opponent.speed ? 'challenger' : 'opponent';

      const firstMover = battle[battle.turn];

      armTimer(battle, async () => {
        if (!getBattle(groupJid)) return;
        await sock.sendMessage(groupJid, {
          text: `⏰ @${firstMover.jid.split('@')[0]} took too long to move — battle cancelled!`,
          mentions: [firstMover.jid],
        });
        deleteBattle(groupJid);
      });

      await sock.sendMessage(groupJid, {
        text: [
          `⚔️ *NINJA BATTLE BEGINS!*`,
          ``,
          `👤 *${battle.challenger.username}*  vs  *${battle.opponent.username}*`,
          ``,
          hpLine(battle.challenger),
          `💙 *${battle.challenger.username}*: ${battle.challenger.chakra}/${battle.challenger.maxChakra} Chakra ${chakraBar(battle.challenger.chakra, battle.challenger.maxChakra, 8)}`,
          ``,
          hpLine(battle.opponent),
          `💙 *${battle.opponent.username}*: ${battle.opponent.chakra}/${battle.opponent.maxChakra} Chakra ${chakraBar(battle.opponent.chakra, battle.opponent.maxChakra, 8)}`,
          ``,
          `🏃 Fastest ninja goes first — @${firstMover.jid.split('@')[0]} attacks!`,
        ].join('\n'),
        mentions: [battle.challenger.jid, battle.opponent.jid],
      });

      return sock.sendMessage(groupJid, {
        text:     buildPrompt(battle, firstMover),
        mentions: [firstMover.jid],
      });
    }

    // ── MOVE COMMANDS — need an active battle ──────────────
    const battle = getBattle(groupJid);

    if (!battle || battle.status !== 'active') {
      return sock.sendMessage(groupJid, {
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

    // Wrong player's turn
    if (mover.jid !== sender) {
      return sock.sendMessage(groupJid, {
        text: `⏳ It's *${mover.username}*'s turn! Wait for them to move.`,
      }, { quoted: msg });
    }

    // ── shared: after any damaging move ───────────────────
    async function afterDamage(header, damage) {
      tickCooldowns(mover);
      battle.turn  = targetKey;
      battle.round++;

      const hitMsg = [
        header,
        ``,
        `💥 @${target.jid.split('@')[0]} was dealt *${damage}* damage!`,
        `❤️ @${target.jid.split('@')[0]}'s remaining HP: ${Math.max(0, target.hp)}/${target.maxHp} ${healthBar(Math.max(0, target.hp), target.maxHp, 10)}`,
      ].join('\n');

      await sock.sendMessage(groupJid, { text: hitMsg, mentions: [mover.jid, target.jid] });

      if (target.hp <= 0) {
        return endBattle(sock, battle, moverKey);
      }

      const nextMover = battle[battle.turn];
      armTimer(battle, async () => {
        if (!getBattle(groupJid)) return;
        await sock.sendMessage(groupJid, {
          text: `⏰ @${nextMover.jid.split('@')[0]} took too long — battle cancelled!`,
          mentions: [nextMover.jid],
        });
        deleteBattle(groupJid);
      });

      return sock.sendMessage(groupJid, {
        text:     buildPrompt(battle, nextMover),
        mentions: [nextMover.jid],
      });
    }

    // ── ATTACK ────────────────────────────────────────────
    if (cmd === 'attack') {
      const damage = calculateDamage(mover, target, null);
      target.hp -= damage;

      return afterDamage(
        `🥊 @${mover.jid.split('@')[0]} throws a *Basic Attack* at @${target.jid.split('@')[0]}!`,
        damage,
      );
    }

    // ── JUTSU ─────────────────────────────────────────────
    if (cmd === 'jutsu') {
      const num   = parseInt(args[1], 10);
      const jutsu = mover.jutsu[num - 1];

      if (!jutsu || isNaN(num)) {
        return sock.sendMessage(groupJid, {
          text: `❌ Invalid jutsu number. Pick 1–${mover.jutsu.length}.`,
        }, { quoted: msg });
      }

      const cd = mover.cooldowns[jutsu.id] || 0;
      if (cd > 0) {
        return sock.sendMessage(groupJid, {
          text: `🔒 *${jutsu.name}* is on cooldown for *${cd}* more turn(s).`,
        }, { quoted: msg });
      }

      if (mover.chakra < jutsu.chakra) {
        return sock.sendMessage(groupJid, {
          text: `💙 Not enough chakra for *${jutsu.name}*!\nNeeded: ${jutsu.chakra} | Yours: ${mover.chakra}`,
        }, { quoted: msg });
      }

      // Deduct chakra & set cooldown before accuracy roll
      mover.chakra -= jutsu.chakra;
      if (jutsu.cooldown) mover.cooldowns[jutsu.id] = jutsu.cooldown;

      // Accuracy check
      const hit = jutsu.accuracy >= 100 || Math.random() * 100 < jutsu.accuracy;
      if (!hit) {
        tickCooldowns(mover);
        battle.turn  = targetKey;
        battle.round++;
        const nextMover = battle[battle.turn];
        armTimer(battle, async () => {
          if (!getBattle(groupJid)) return;
          await sock.sendMessage(groupJid, {
            text: `⏰ @${nextMover.jid.split('@')[0]} took too long — battle cancelled!`,
            mentions: [nextMover.jid],
          });
          deleteBattle(groupJid);
        });
        await sock.sendMessage(groupJid, {
          text: `💨 @${mover.jid.split('@')[0]} unleashed *${jutsu.name}*... but it *missed!* 💫\n💙 Chakra: ${mover.chakra}/${mover.maxChakra}`,
          mentions: [mover.jid],
        });
        return sock.sendMessage(groupJid, {
          text:     buildPrompt(battle, nextMover),
          mentions: [nextMover.jid],
        });
      }

      // Hit
      const crit   = chance(10);
      const base   = calculateDamage(mover, target, jutsu);
      const damage = crit ? base * 2 : base;
      target.hp -= damage;

      const header = [
        `🌀 @${mover.jid.split('@')[0]} unleashes *${jutsu.name}*!`,
        crit ? `✨ *CRITICAL HIT!*` : null,
      ].filter(Boolean).join('\n');

      return afterDamage(header, damage);
    }

    // ── ITEM ──────────────────────────────────────────────
    if (cmd === 'item') {
      const itemId = args[1];
      if (!itemId) {
        return sock.sendMessage(groupJid, {
          text: `❌ Specify item ID.\nExample: *.nbattle item small_hp_potion*`,
        }, { quoted: msg });
      }

      const invIdx = (mover.inventory || []).findIndex(i => i.id === itemId);
      if (invIdx === -1) {
        return sock.sendMessage(groupJid, {
          text: `❌ You don't have *${itemId}* in your bag.\n\nCheck *.nbattle* for your available items.`,
        }, { quoted: msg });
      }

      const def = itemsLib.find(x => x.id === itemId);
      if (!def || !['consumable', 'battle'].includes(def.type)) {
        return sock.sendMessage(groupJid, {
          text: `❌ *${itemId}* can't be used during battle.`,
        }, { quoted: msg });
      }

      // Remove from battle snapshot
      mover.inventory[invIdx].amount = (mover.inventory[invIdx].amount || 1) - 1;
      if (mover.inventory[invIdx].amount <= 0) mover.inventory.splice(invIdx, 1);

      // Remove from DB inventory
      const playerDoc = await players.get(sender);
      if (playerDoc) {
        const dbIdx = (playerDoc.inventory || []).findIndex(i => i.id === itemId);
        if (dbIdx !== -1) {
          playerDoc.inventory[dbIdx].amount = (playerDoc.inventory[dbIdx].amount || 1) - 1;
          if (playerDoc.inventory[dbIdx].amount <= 0) playerDoc.inventory.splice(dbIdx, 1);
          await playerDoc.save();
        }
      }

      // ── Consumable: heal self, counts as turn ──────────
      if (def.type === 'consumable') {
        const effects = [];
        if (def.effect?.hp) {
          const healed  = Math.min(def.effect.hp, mover.maxHp - mover.hp);
          mover.hp      = Math.min(mover.maxHp, mover.hp + def.effect.hp);
          effects.push(`❤️ Restored ${healed} HP → ${mover.hp}/${mover.maxHp} ${healthBar(mover.hp, mover.maxHp, 8)}`);
        }
        if (def.effect?.chakra) {
          const restored = Math.min(def.effect.chakra, mover.maxChakra - mover.chakra);
          mover.chakra   = Math.min(mover.maxChakra, mover.chakra + def.effect.chakra);
          effects.push(`💙 Restored ${restored} Chakra → ${mover.chakra}/${mover.maxChakra}`);
        }

        tickCooldowns(mover);
        battle.turn  = targetKey;
        battle.round++;
        const nextMover = battle[battle.turn];
        armTimer(battle, async () => {
          if (!getBattle(groupJid)) return;
          await sock.sendMessage(groupJid, {
            text: `⏰ @${nextMover.jid.split('@')[0]} took too long — battle cancelled!`,
            mentions: [nextMover.jid],
          });
          deleteBattle(groupJid);
        });
        await sock.sendMessage(groupJid, {
          text: `🎒 @${mover.jid.split('@')[0]} uses *${def.name}*!\n\n${effects.join('\n')}`,
          mentions: [mover.jid],
        });
        return sock.sendMessage(groupJid, {
          text:     buildPrompt(battle, nextMover),
          mentions: [nextMover.jid],
        });
      }

      // ── Battle item: deal damage ───────────────────────
      if (def.type === 'battle') {
        const damage = def.damage || 0;
        target.hp -= damage;
        return afterDamage(
          `💣 @${mover.jid.split('@')[0]} hurls a *${def.name}* at @${target.jid.split('@')[0]}!`,
          damage,
        );
      }
    }

    // ── FLEE ──────────────────────────────────────────────
    if (cmd === 'flee') {
      await sock.sendMessage(groupJid, {
        text: [
          `🏃 @${mover.jid.split('@')[0]} has fled the battle!`,
          ``,
          `🏆 @${target.jid.split('@')[0]} wins by default!`,
          `💰 +150 Ryo | ✨ +50 XP`,
        ].join('\n'),
        mentions: [target.jid, mover.jid],
      });

      const [winDoc, loseDoc] = await Promise.all([
        players.get(target.jid),
        players.get(sender),
      ]);
      if (winDoc) { winDoc.wins = (winDoc.wins || 0) + 1; winDoc.xp += 50; winDoc.ryo += 150; await winDoc.save(); }
      if (loseDoc) { loseDoc.losses = (loseDoc.losses || 0) + 1; await loseDoc.save(); }

      return deleteBattle(groupJid);
    }

    // ── No recognised sub-command: show current prompt ────
    return sock.sendMessage(groupJid, {
      text:     buildPrompt(battle, mover),
      mentions: [mover.jid],
    }, { quoted: msg });
  },
};
