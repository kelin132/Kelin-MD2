// plugins/naruto/nbattle.js

import players from "../../lib/naruto/players.js";
import battle from "../../lib/naruto/battle.js";

export default {
  name: "nbattle",
  description: "Battle another ninja",
  category: "naruto",
  usage: ".nbattle @user",

  async run({ sock, msg, sender }) {

    const jid = msg.key.remoteJid;

    try {

      const mentioned =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
        || msg.message?.extendedTextMessage?.contextInfo?.quotedParticipant
        || null;

      const opponent = Array.isArray(mentioned) ? mentioned[0] : mentioned;

      if (!opponent) {
        return sock.sendMessage(jid, {
          text:
`⚔️ Mention a ninja to battle.

Example:
.nbattle @user`
        }, { quoted: msg });
      }

      if (sender === opponent) {
        return sock.sendMessage(jid, {
          text: "❌ You cannot fight yourself."
        }, { quoted: msg });
      }

      const player = await players.get(sender);
      const enemy  = await players.get(opponent);

      if (!player || !enemy) {
        return sock.sendMessage(jid, {
          text:
`❌ Both players need a ninja profile.

Use .nstart to create one.`
        }, { quoted: msg });
      }

      // Create battle state
      let fight = battle.create(player, enemy);
      let log   = [];

      // Decide who attacks first (higher speed goes first)
      const playerFirst = fight.player.speed >= fight.enemy.speed;

      // Run up to 6 rounds
      for (let round = 0; round < 6; round++) {
        if (battle.isFinished(fight)) break;

        if (playerFirst ? round % 2 === 0 : round % 2 === 1) {
          const hit = battle.attack(fight.player, fight.enemy);
          log.push(`⚔️ ${hit.message}`);
        } else {
          const hit = battle.attack(fight.enemy, fight.player);
          log.push(`🛡 ${hit.message}`);
        }
      }

      const winner = battle.winner(fight);

      // Update stats
      if (winner === "player") {
        player.wins  = (player.wins  || 0) + 1;
        player.xp   += 100;
        player.ryo  += 300;
        enemy.losses = (enemy.losses || 0) + 1;
      } else if (winner === "enemy") {
        enemy.wins   = (enemy.wins   || 0) + 1;
        enemy.xp    += 100;
        enemy.ryo   += 300;
        player.losses = (player.losses || 0) + 1;
      }

      await player.save();
      await enemy.save();

      const winnerName = winner === "player"
        ? `@${sender.split("@")[0]}`
        : `@${opponent.split("@")[0]}`;

      await sock.sendMessage(jid, {
        text:
`⚔️ *NINJA BATTLE*

👤 ${player.username} vs ${enemy.username}

━━━━━━━━━
${log.slice(0, 6).join("\n")}
━━━━━━━━━

❤️ ${player.username} HP: ${Math.max(0, fight.player.hp)}/${fight.player.maxHp}
❤️ ${enemy.username} HP: ${Math.max(0, fight.enemy.hp)}/${fight.enemy.maxHp}

🏆 Winner: *${winnerName}*
💰 Reward: +300 Ryo | +100 XP`,
        mentions: [sender, opponent]
      }, { quoted: msg });

    } catch (err) {
      console.error("NBATTLE ERROR:", err);
      await sock.sendMessage(jid, {
        text: "❌ Battle failed. Please try again."
      }, { quoted: msg });
    }
  }
};
