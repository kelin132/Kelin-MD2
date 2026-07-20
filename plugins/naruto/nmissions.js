// plugins/naruto/nmissions.js
// Complete ninja missions — shows Kakashi (mission commander) art

import players  from "../../lib/naruto/players.js";
import missions from "../../lib/naruto/missions.js";
import { random } from "../../lib/naruto/utils.js";
import { sendWithCharacterImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

// Mission rank → themed character to show
const MISSION_CHARACTERS = {
  D: "Iruka Umino",
  C: "Kakashi Hatake",
  B: "Kakashi Hatake",
  A: "Tsunade",
  S: "Minato Namikaze",
};

export default {
  name: "nmission",
  description: "Complete ninja missions",
  category: "naruto",
  usage: ".nmission",
  cooldown: 60,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const available = missions.filter(m => player.level >= (m.minLevel || 1));

      if (!available.length) {
        return sock.sendMessage(jid, {
          text: "⚠️ You are not strong enough for any missions yet.\n\nTrain using .ntrain"
        }, { quoted: msg });
      }

      const mission = random(available);
      const success = Math.random() < 0.75;

      const charName = MISSION_CHARACTERS[mission.rank] || "Kakashi Hatake";

      if (!success) {
        player.hp = Math.max(0, (player.hp || player.maxHp) - 20);
        await player.save();

        return sendWithCharacterImage(sock, jid, msg,
`❌ *MISSION FAILED*

📜 ${mission.name}
🎖️ Rank: ${mission.rank}

You were defeated during the mission!
❤️ HP lost: -20
❤️ Current HP: ${player.hp}/${player.maxHp}

Train harder, ninja. Use .ntrain`,
          charName, "defeat");
      }

      player.xp  += mission.xp;
      player.ryo += mission.ryo;
      player.missionsCompleted = (player.missionsCompleted || 0) + 1;

      let levelUp = "";
      if (player.xp >= player.xpNeeded) {
        player.xp       -= player.xpNeeded;
        player.level++;
        player.xpNeeded  = Math.floor(player.xpNeeded * 1.25);
        player.maxHp    += 20;
        player.maxChakra += 15;
        player.hp        = player.maxHp;
        player.chakra    = player.maxChakra;
        levelUp = `\n\n🎉 *LEVEL UP!* You are now Level ${player.level}!`;
      }

      await player.save();

      return sendWithCharacterImage(sock, jid, msg,
`✅ *MISSION COMPLETE*

📜 ${mission.name}
🎖️ Rank: ${mission.rank}

🎁 *Rewards*
✨ XP: +${mission.xp}
💰 Ryo: +${mission.ryo}

📊 *Progress*
⭐ Level: ${player.level}
✨ XP: ${player.xp}/${player.xpNeeded}
📋 Missions Done: ${player.missionsCompleted}${levelUp}`,
        charName, "mission");

    } catch (err) {
      console.error("NMISSIONS ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Mission error." }, { quoted: msg });
    }
  }
};
