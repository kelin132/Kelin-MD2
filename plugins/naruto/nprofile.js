// plugins/naruto/nprofile.js
// Naruto player profile, leaderboard, and compare
// Usage: .nprofile | .nprofile leaderboard | .nprofile compare

import { generateProfileImage, generateLeaderboardImage } from '../../lib/naruto-canvas-image-generator.mjs';
import Players from '../../lib/naruto/players.js';
import { getDb } from '../../lib/mongo.mjs';

export default {
  name: 'nprofile',
  description: 'View your ninja profile',
  category: 'naruto',
  usage: '.nprofile | .nprofile leaderboard | .nprofile compare',
  aliases: ['nme'],
  cooldown: 5,

  async run({ sock, msg, args, sender }) {
    const jid    = msg.key.remoteJid;
    const subCmd = args[0]?.toLowerCase();

    try {
      // ── Leaderboard ───────────────────────────────────────────────────────
      if (subCmd === 'leaderboard' || subCmd === 'lb' || subCmd === 'top') {
        const db         = getDb();
        const allPlayers = await db.collection('naruto_players').find({}).sort({ xp: -1 }).limit(10).toArray();

        if (!allPlayers.length) {
          return sock.sendMessage(jid, { text: '❌ No players in the leaderboard yet!\n\nUse .nstart to be the first.' }, { quoted: msg });
        }

        const data = allPlayers.map((p, i) => ({
          username: p.username || p.jid.split('@')[0],
          level:    Math.floor((p.xp || 0) / 100) + 1,
          xp:       p.xp || 0,
          rank:     i + 1,
        }));

        const img = await generateLeaderboardImage(data);

        const medals = ['🥇', '🥈', '🥉'];
        let caption = `🏆 *TOP 10 NINJAS* 🏆\n\n`;
        data.forEach((p, i) => {
          caption += `${medals[i] || `#${i + 1}`} ${p.username} — Lv${p.level} (${p.xp} XP)\n`;
        });

        const myIdx = allPlayers.findIndex(p => p.jid === sender);
        if (myIdx >= 0) caption += `\n*Your Rank:* #${myIdx + 1}`;

        return sock.sendMessage(jid, { image: img, caption }, { quoted: msg });
      }

      // ── Compare ───────────────────────────────────────────────────────────
      if (subCmd === 'compare') {
        const player = await Players.get(sender);
        if (!player) return sock.sendMessage(jid, { text: '❌ You must register first!\nUse: .nstart' }, { quoted: msg });

        const db  = getDb();
        const top = await db.collection('naruto_players').find({ jid: { $ne: sender } }).sort({ xp: -1 }).limit(1).toArray();

        if (!top.length) return sock.sendMessage(jid, { text: '❌ No other players to compare with yet!' }, { quoted: msg });

        const rival  = top[0];
        const lv1    = Math.floor((player.xp || 0) / 100) + 1;
        const lv2    = Math.floor((rival.xp   || 0) / 100) + 1;
        const total1 = (player.attack || 10) + (player.defense || 10) + (player.speed || 10);
        const total2 = (rival.attack  || 10) + (rival.defense  || 10) + (rival.speed  || 10);

        const verdict = total1 > total2
          ? `💪 *${player.username}* is stronger!`
          : total2 > total1
            ? `💪 *${rival.username || rival.jid.split('@')[0]}* is stronger!`
            : `🤝 You are equally matched!`;

        return sock.sendMessage(jid, {
          text: `⚔️ *PLAYER COMPARISON* ⚔️\n\n` +
            `*${player.username}*\nLv${lv1} | ⚔️ ${player.attack || 10} | 🛡️ ${player.defense || 10} | 💨 ${player.speed || 10}\n\nVS\n\n` +
            `*${rival.username || rival.jid.split('@')[0]}*\nLv${lv2} | ⚔️ ${rival.attack || 10} | 🛡️ ${rival.defense || 10} | 💨 ${rival.speed || 10}\n\n${verdict}`,
        }, { quoted: msg });
      }

      // ── Default: player profile ───────────────────────────────────────────
      const player = await Players.get(sender);
      if (!player) return sock.sendMessage(jid, { text: '❌ You must register first!\nUse: .nstart' }, { quoted: msg });

      const img          = await generateProfileImage(player);
      const level        = Math.floor((player.xp || 0) / 100) + 1;
      const nextLevelXp  = (level * 100) - (player.xp || 0);

      return sock.sendMessage(jid, {
        image: img,
        caption: `👤 *${player.username}'s PROFILE*\n\n` +
          `*Rank:* ${player.rank || 'Academy Student'}\n` +
          `*Level:* ${level} (${nextLevelXp} XP to next)\n` +
          `*Village:* ${player.village || 'Unknown'}\n` +
          `*Clan:* ${player.clan || 'Common'}\n\n` +
          `*Stats:*\n⚔️ ATK ${player.attack || 10} | 🛡️ DEF ${player.defense || 10}\n💨 SPD ${player.speed || 10} | ❤️ HP ${player.hp || 100}/${player.maxHp || 100}\n⚡ Chakra ${player.chakra || 100}/${player.maxChakra || 100}\n\n` +
          `💰 Ryo: ${player.ryo || 0} | XP: ${player.xp || 0}\n\n` +
          `*.ntrain <stat>* — Train\n*.nmission* — Battle\n*.nprofile leaderboard* — Rankings`,
      }, { quoted: msg });

    } catch (err) {
      console.error('nprofile error:', err);
      return sock.sendMessage(jid, { text: '❌ Error!\n' + err.message }, { quoted: msg });
    }
  },
};
