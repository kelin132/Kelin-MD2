// plugins/naruto/ntrain.js
// Naruto training system
// Usage: .ntrain [attack|defense|speed|chakra] | .ntrain stats | .ntrain bulk <n>

import { generateTrainingImage } from '../../lib/naruto-canvas-image-generator.mjs';
import Players from '../../lib/naruto/players.js';

const VALID_STATS  = ['attack', 'defense', 'speed', 'chakra'];
const COOLDOWN_MS  = 10 * 60 * 1000; // 10 minutes

export default {
  name: 'ntrain',
  description: 'Train your ninja stats',
  category: 'naruto',
  usage: '.ntrain [attack|defense|speed|chakra|stats|bulk <n>]',
  aliases: ['ntraining'],
  cooldown: 3,

  async run({ sock, msg, args, sender }) {
    const jid    = msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase();

    try {
      const player = await Players.get(sender);
      if (!player) return sock.sendMessage(jid, { text: '❌ You must register first!\nUse: .nstart' }, { quoted: msg });

      const currentStats = {
        attack:  player.attack  || 10,
        defense: player.defense || 10,
        speed:   player.speed   || 10,
        chakra:  player.chakra  || 100,
      };

      // ── Show stats (no cooldown needed) ──────────────────────────────────
      if (!subCmd || subCmd === 'stats' || subCmd === 'info') {
        const img = await generateTrainingImage(player, currentStats, player.level);
        return sock.sendMessage(jid, {
          image: img,
          caption: `📊 *YOUR STATS*\n\n` +
            `⚔️ Attack: ${currentStats.attack}\n🛡️ Defense: ${currentStats.defense}\n💨 Speed: ${currentStats.speed}\n⚡ Chakra: ${currentStats.chakra}\n\n` +
            `Level: ${player.level} | XP: ${player.xp}/${player.xpNeeded} | 💰 ${player.ryo || 0} Ryo\n🎖️ Rank: ${player.rank}\n\n` +
            `*Train:* .ntrain <attack|defense|speed|chakra>\n*Bulk:* .ntrain bulk <1–20>`,
        }, { quoted: msg });
      }

      // ── Cooldown check (applies to all actual training) ──────────────────
      const now         = Date.now();
      const lastTrained = player.lastTrained ? new Date(player.lastTrained).getTime() : 0;
      const elapsed     = now - lastTrained;

      if (elapsed < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - elapsed;
        const mins      = Math.floor(remaining / 60000);
        const secs      = Math.ceil((remaining % 60000) / 1000);
        const timeStr   = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        return sock.sendMessage(jid, {
          text: `⏳ *Training cooldown!*\n\nYou need to rest before training again.\nCome back in *${timeStr}*.`,
        }, { quoted: msg });
      }

      // ── Bulk training ─────────────────────────────────────────────────────
      if (subCmd === 'bulk') {
        const sessions = Math.min(20, Math.max(1, parseInt(args[1]) || 5));
        if (isNaN(parseInt(args[1])) && args[1]) {
          return sock.sendMessage(jid, { text: '❌ Usage: .ntrain bulk <1–20>\nExample: .ntrain bulk 10' }, { quoted: msg });
        }

        const gains = { attack: 0, defense: 0, speed: 0, chakra: 0 };
        let totalXp = 0;
        for (let i = 0; i < sessions; i++) {
          const stat = VALID_STATS[Math.floor(Math.random() * VALID_STATS.length)];
          const gain = Math.floor(Math.random() * 5) + 1;
          gains[stat] += gain;
          totalXp     += gain * 10;
        }

        // Apply stat gains + stamp cooldown
        await Players.update(sender, {
          $inc: {
            attack:  gains.attack,
            defense: gains.defense,
            speed:   gains.speed,
            chakra:  gains.chakra,
          },
          $set: { lastTrained: new Date().toISOString() },
        });

        const result = await Players.addXP(sender, totalXp);
        const updated = result.player;

        let rankUpLine = '';
        if (result.rankedUp) {
          rankUpLine = `\n\n🎊 *RANK UP!* ${result.oldRank} → *${result.newRank}*`;
        } else if (result.leveledUp) {
          rankUpLine = `\n\n⬆️ *LEVEL UP!* Now Level ${updated.level} | Rank: ${updated.rank}`;
        }

        return sock.sendMessage(jid, {
          text: `💪 *BULK TRAINING COMPLETE!* (${sessions} sessions)\n\n` +
            `*Gains:*\n⚔️ +${gains.attack} Attack\n🛡️ +${gains.defense} Defense\n💨 +${gains.speed} Speed\n⚡ +${gains.chakra} Chakra\n+${totalXp} XP\n\n` +
            `*New Stats:*\n⚔️ ${currentStats.attack + gains.attack}\n🛡️ ${currentStats.defense + gains.defense}\n💨 ${currentStats.speed + gains.speed}\n⚡ ${currentStats.chakra + gains.chakra}\n\n` +
            `Level: ${updated.level} | 🎖️ Rank: ${updated.rank}${rankUpLine}\n\n⏳ Next training available in *10 minutes*.`,
        }, { quoted: msg });
      }

      // ── Single stat training ──────────────────────────────────────────────
      if (!VALID_STATS.includes(subCmd)) {
        return sock.sendMessage(jid, {
          text: `🥋 *TRAINING DOJO*\n\n*Choose a stat to train:*\n⚔️ .ntrain attack\n🛡️ .ntrain defense\n💨 .ntrain speed\n⚡ .ntrain chakra\n\n📊 .ntrain stats — view your stats\n💪 .ntrain bulk <1–20> — train multiple sessions`,
        }, { quoted: msg });
      }

      const gain   = Math.floor(Math.random() * 5) + 1;
      const xpGain = gain * 10;

      // Apply stat gain + stamp cooldown, then XP
      await Players.update(sender, {
        $inc: { [subCmd]: gain },
        $set: { lastTrained: new Date().toISOString() },
      });
      const result  = await Players.addXP(sender, xpGain);
      const updated = result.player;

      currentStats[subCmd] += gain;
      const img = await generateTrainingImage(updated, currentStats, updated.level);

      const emojis = { attack: '⚔️', defense: '🛡️', speed: '💨', chakra: '⚡' };

      let rankUpLine = '';
      if (result.rankedUp) {
        rankUpLine = `\n\n🎊 *RANK UP!* ${result.oldRank} → *${result.newRank}*\n🎉 Congratulations, ${updated.username}!`;
      } else if (result.leveledUp) {
        rankUpLine = `\n\n⬆️ *LEVEL UP!* Now Level ${updated.level}`;
      }

      return sock.sendMessage(jid, {
        image: img,
        caption: `🥋 *TRAINING COMPLETE!*\n\n${emojis[subCmd]} *${subCmd.toUpperCase()}* +${gain} points\n+${xpGain} XP\n\n` +
          `*Stats:*\n⚔️ ${currentStats.attack} | 🛡️ ${currentStats.defense} | 💨 ${currentStats.speed} | ⚡ ${currentStats.chakra}\n\n` +
          `Level: ${updated.level} | 🎖️ Rank: ${updated.rank}${rankUpLine}\n\n⏳ Next training available in *10 minutes*.`,
      }, { quoted: msg });

    } catch (err) {
      console.error('ntrain error:', err);
      return sock.sendMessage(jid, { text: '❌ Training error!\n' + err.message }, { quoted: msg });
    }
  },
};
