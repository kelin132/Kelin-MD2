// plugins/naruto/nhunt.js
// Fight rogue ninjas and enemies — shows real villain character art

import players from "../../lib/naruto/players.js";
import enemies from "../../lib/naruto/enemies.js";
import battle  from "../../lib/naruto/battle.js";
import { random } from "../../lib/naruto/utils.js";
import { sendWithEnemyImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

export default {
  name: "nhunt",
  description: "Fight rogue ninjas and enemies",
  category: "naruto",
  usage: ".nhunt",
  cooldown: 30,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const enemy = random(enemies.filter(e => e.level <= player.level + 10));

      if (!enemy) {
        return sock.sendMessage(jid, { text: "⚠️ No enemies found for your level." }, { quoted: msg });
      }

      let fight = battle.create(player, enemy);
      let log   = [];

      const playerAttack = battle.attack(fight.player, fight.enemy);
      log.push(`🥷 ${playerAttack.message}`);

      if (fight.enemy.hp > 0) {
        const enemyAttack = battle.enemyTurn(fight.player, fight.enemy);
        log.push(`👹 ${enemyAttack.message}`);
      }

      if (fight.enemy.hp <= 0) {
        player.xp   += enemy.xpReward || enemy.xp || 30;
        player.ryo  += enemy.ryoReward || enemy.ryo || 80;
        player.wins  = (player.wins || 0) + 1;
        await player.save();

        return sendWithEnemyImage(sock, jid, msg,
`🏆 *VICTORY!*

👹 Enemy: ${enemy.name} (Lv ${enemy.level})

${log.join("\n")}

🎁 *Rewards*
✨ XP: +${enemy.xpReward || enemy.xp || 30}
💰 Ryo: +${enemy.ryoReward || enemy.ryo || 80}
🏆 Total Wins: ${player.wins}`,
          enemy.name);
      }

      if (fight.player.hp <= 0) {
        player.losses = (player.losses || 0) + 1;
        player.hp     = Math.floor(player.maxHp / 2);
        await player.save();

        return sendWithEnemyImage(sock, jid, msg,
`☠️ *DEFEATED!*

👹 Enemy: ${enemy.name} (Lv ${enemy.level})

${log.join("\n")}

You escaped with half HP.
❤️ HP: ${player.hp}/${player.maxHp}
☠️ Losses: ${player.losses}`,
          enemy.name);
      }

      return sendWithEnemyImage(sock, jid, msg,
`⚔️ *BATTLE*

👹 Enemy: ${enemy.name} (Lv ${enemy.level})

${log.join("\n")}

❤️ Enemy HP: ${Math.max(0, fight.enemy.hp)}/${enemy.hp}
❤️ Your HP: ${Math.max(0, fight.player.hp)}/${player.maxHp}

Use .nhunt again to continue.`,
        enemy.name);

    } catch (err) {
      console.error("NHUNT ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Hunt failed." }, { quoted: msg });
    }
  }
};
