// plugins/naruto/nbattle.js

import players from "../../lib/naruto/players.js";
import battle from "../../lib/naruto/battle.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

export default {
  name: "nbattle",
  description: "Battle another ninja",
  category: "naruto",
  usage: ".nbattle @user",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const ctx      = msg.message?.extendedTextMessage?.contextInfo || {};
      const opponent = ctx.mentionedJid?.[0] || ctx.participant || ctx.quotedParticipant || null;

      if (!opponent) {
        return sock.sendMessage(jid, {
          text: "⚔️ Mention a ninja to battle.\n\nExample: .nbattle @user"
        }, { quoted: msg });
      }

      if (sender === opponent) {
        return sock.sendMessage(jid, { text: "❌ You cannot fight yourself." }, { quoted: msg });
      }

      const playerDoc   = await players.get(sender);
      const opponentDoc = await players.get(opponent);

      if (!playerDoc || !opponentDoc) {
        return sock.sendMessage(jid, {
          text: "❌ Both players need a ninja profile.\n\nUse .nstart to create one."
        }, { quoted: msg });
      }

      // battle.create() expects enemy.name (not .username) — normalise here
      const opponentForBattle = {
        username: opponentDoc.username,
        name:     opponentDoc.username,
        hp:       opponentDoc.hp,
        maxHp:    opponentDoc.maxHp,
        chakra:   opponentDoc.chakra,
        attack:   opponentDoc.attack,
        defense:  opponentDoc.defense,
        speed:    opponentDoc.speed,
        jutsu:    (opponentDoc.jutsu || []).map(j => j.id), // enemyTurn expects id strings
      };

      let fight = battle.create(playerDoc, opponentForBattle);
      let log   = [];

      const playerFirst = fight.player.speed >= fight.enemy.speed;

      for (let round = 0; round < 6; round++) {
        if (battle.isFinished(fight)) break;
        if (playerFirst ? round % 2 === 0 : round % 2 === 1) {
          const hit = battle.attack(fight.player, fight.enemy);
          log.push(`⚔️ ${hit.message}`);
        } else {
          const hit = battle.attack(fight.enemy, fight.player);
          log.push(`🛡️ ${hit.message}`);
        }
      }

      const winner = battle.winner(fight);

      if (winner === "player") {
        playerDoc.wins    = (playerDoc.wins    || 0) + 1;
        playerDoc.xp     += 100;
        playerDoc.ryo    += 300;
        opponentDoc.losses = (opponentDoc.losses || 0) + 1;
      } else if (winner === "enemy") {
        opponentDoc.wins  = (opponentDoc.wins  || 0) + 1;
        opponentDoc.xp   += 100;
        opponentDoc.ryo  += 300;
        playerDoc.losses  = (playerDoc.losses  || 0) + 1;
      }

      await playerDoc.save();
      await opponentDoc.save();

      const winnerName = winner === "player"
        ? `@${sender.split("@")[0]}`
        : `@${opponent.split("@")[0]}`;

      const caption =
`⚔️ *NINJA BATTLE*

👤 *${playerDoc.username}* vs *${opponentDoc.username}*

━━━━━━━━━━━━
${log.slice(0, 6).join("\n")}
━━━━━━━━━━━━

❤️ ${playerDoc.username}: ${Math.max(0, fight.player.hp)}/${fight.player.maxHp} HP
❤️ ${opponentDoc.username}: ${Math.max(0, fight.enemy.hp)}/${fight.enemy.maxHp} HP

🏆 Winner: *${winnerName}*
💰 Reward: +300 Ryo | +100 XP`;

      return sendWithGif(sock, jid, msg, caption, "naruto battle fight");

    } catch (err) {
      console.error("NBATTLE ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Battle failed. Please try again." }, { quoted: msg });
    }
  }
};
