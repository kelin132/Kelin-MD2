
// plugins/naruto/nmission.js

import players from "../../lib/naruto/players.js";
import missions from "../../lib/naruto/missions.js";
import { random } from "../../lib/naruto/utils.js";

export default {
  name: "nmission",
  description: "Complete ninja missions",
  category: "naruto",
  usage: ".nmission",

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


      const available = missions.filter(
        m => player.level >= m.minLevel
      );


      if (!available.length) {
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`⚠️ You are not strong enough for any missions yet.

Train using .ntrain`
          },
          { quoted: msg }
        );
      }


      const mission = random(available);


      const success =
        Math.random() < 0.75;


      if (!success) {

        player.hp -= 20;

        if (player.hp < 0)
          player.hp = 0;


        await player.save();


        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`❌ MISSION FAILED

📜 Mission:
${mission.name}

Rank:
${mission.rank}

You were defeated during the mission!

❤️ HP lost:
-20

Current HP:
${player.hp}/${player.maxHp}

Train harder, ninja.`
          },
          { quoted: msg }
        );
      }


      player.xp += mission.xp;
      player.ryo += mission.ryo;
      player.missionsCompleted++;


      let levelUp = "";


      if (player.xp >= player.xpNeeded) {

        player.xp -= player.xpNeeded;

        player.level++;

        player.xpNeeded =
          Math.floor(player.xpNeeded * 1.25);


        player.maxHp += 20;
        player.maxChakra += 15;

        player.hp = player.maxHp;
        player.chakra = player.maxChakra;


        levelUp =
`🎉 LEVEL UP!
New Level: ${player.level}`;
      }


      await player.save();


      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
`✅ MISSION COMPLETE

📜 ${mission.name}

🎖 Rank:
${mission.rank}

✨ XP:
+${mission.xp}

💰 Ryo:
+${mission.ryo}

⭐ Level:
${player.level}

${levelUp}

Completed Missions:
${player.missionsCompleted}`
        },
        { quoted: msg }
      );


    } catch (err) {

      console.log(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text:
          "❌ Mission error."
        },
        { quoted: msg }
      );

    }
  }
};