// plugins/naruto/ntrain.js

import players from "../../lib/naruto/players.js";
import { randomInt } from "../../lib/naruto/utils.js";

export default {
  name: "ntrain",
  description: "Train your ninja and gain power",
  category: "naruto",
  usage: ".ntrain",
  cooldown: 900, // 15 minutes

  async run({ sock, msg, sender }) {

    try {

      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(
          sender,
          {
            text:
`🥷 You don't have a ninja profile.

Use .nstart first.`
          },
          { quoted: msg }
        );
      }


      const now = Date.now();

      if (
        player.cooldowns?.train &&
        now < player.cooldowns.train
      ) {

        const remaining =
          Math.ceil(
            (player.cooldowns.train - now) / 60000
          );

        return sock.sendMessage(
          sender,
          {
            text:
`⏳ You are exhausted!

Train again in ${remaining} minutes.`
          },
          { quoted: msg }
        );

      }


      const xp = randomInt(30, 80);

      const attack = randomInt(1, 5);
      const defense = randomInt(1, 4);
      const speed = randomInt(1, 3);


      player.xp += xp;

      player.attack += attack;
      player.defense += defense;
      player.speed += speed;


      player.cooldowns = {
        ...player.cooldowns,
        train: now + (15 * 60 * 1000)
      };


      let levelUp = false;


      if (player.xp >= player.xpNeeded) {

        player.xp -= player.xpNeeded;

        player.level++;

        player.xpNeeded =
          Math.floor(
            player.xpNeeded * 1.25
          );


        player.maxHp += 20;
        player.maxChakra += 15;

        player.hp = player.maxHp;
        player.chakra = player.maxChakra;


        levelUp = true;
      }


      await player.save();


      await sock.sendMessage(
        sender,
        {
          text:
`🥋 TRAINING COMPLETE

🥷 ${player.username}

✨ XP Gained:
+${xp}

⚔ Attack:
+${attack}

🛡 Defense:
+${defense}

💨 Speed:
+${speed}


⭐ Level:
${player.level}

${levelUp ? "🎉 LEVEL UP!" : ""}

Next training:
15 minutes`
        },
        { quoted: msg }
      );


    } catch (err) {

      console.log(err);

      await sock.sendMessage(
        sender,
        {
          text:
          "❌ Training failed."
        },
        { quoted: msg }
      );

    }
  }
};
