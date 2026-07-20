// plugins/naruto/nhunt.js

import players from "../../lib/naruto/players.js";
import enemies from "../../lib/naruto/enemies.js";
import battle from "../../lib/naruto/battle.js";
import { random } from "../../lib/naruto/utils.js";

export default {
  name: "nhunt",
  description: "Fight rogue ninjas and enemies",
  category: "naruto",
  usage: ".nhunt",

  async run({ sock, msg, sender }) {

    try {

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`🥷 You don't have a ninja profile.

Use .nstart first.`
          },
          { quoted: msg }
        );
      }


      const enemy = random(
        enemies.filter(
          e => e.level <= player.level + 10
        )
      );


      if (!enemy) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`⚠️ No enemies found for your level.`
          },
          { quoted: msg }
        );
      }


      let fight = battle.create(
        player,
        enemy
      );


      let log = [];


      // Player attacks first
      const playerAttack =
        battle.attack(
          fight.player,
          fight.enemy
        );


      log.push(
        `🥷 ${playerAttack.message}`
      );


      // Enemy attacks if alive
      if (fight.enemy.hp > 0) {

        const enemyAttack =
          battle.enemyTurn(
            fight.player,
            fight.enemy
          );

        log.push(
          `👹 ${enemyAttack.message}`
        );

      }


      // Result

      if (fight.enemy.hp <= 0) {

        player.xp += enemy.xp;
        player.ryo += enemy.ryo;

        player.wins++;


        await player.save();


        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`🏆 VICTORY!

👹 Enemy:
${enemy.name}

${log.join("\n\n")}

🎁 Rewards:

✨ XP:
+${enemy.xp}

💰 Ryo:
+${enemy.ryo}

🏆 Wins:
${player.wins}`
          },
          { quoted: msg }
        );

      }


      if (fight.player.hp <= 0) {

        player.losses++;

        player.hp = Math.floor(
          player.maxHp / 2
        );


        await player.save();


        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`☠️ DEFEATED!

👹 Enemy:
${enemy.name}

${log.join("\n\n")}

You escaped with half HP.

Losses:
${player.losses}`
          },
          { quoted: msg }
        );

      }


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`⚔️ BATTLE

👹 Enemy:
${enemy.name}

${log.join("\n\n")}

❤️ Enemy HP:
${fight.enemy.hp}/${enemy.hp}

❤️ Your HP:
${fight.player.hp}/${player.maxHp}

Use .nhunt again to continue fighting.`
        },
        { quoted: msg }
      );


    } catch(err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Hunt failed."
        },
        { quoted: msg }
      );

    }
  }
};