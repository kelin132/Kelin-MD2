// plugins/dragonball/dprofile.js
// View your Dragon Ball Z fighter stats

import players from "../../lib/dragonball/players.js";
import { generateProfileScene } from "../../lib/dbzBattleCanvas.mjs";
import { getRankName } from "../../lib/dragonball/utils.js";

export default {
  name: "dprofile",
  description: "View your Dragon Ball Z fighter profile",
  category: "dragonball",
  usage: ".dprofile",
  aliases: ["dbzprofile", "dstats", "dme"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🐉 You don't have a Dragon Ball Z fighter yet!\n\nUse *.dbzstart* to create your fighter.",
        }, { quoted: msg });
      }

      const rank = getRankName(player.level);

      const caption =
`🐉 *FIGHTER PROFILE*

⚡ Name: ${player.username}
🌍 Race: ${player.race || "Unknown"}
🐉 Character: ${player.character || "Unknown"}
🥊 Rank: ${rank}

⭐ Level: ${player.level}
✨ XP: ${player.xp}/${player.xpNeeded}
❤️ HP: ${player.hp}/${player.maxHp}
💠 KI: ${player.ki}/${player.maxKi}
⚔️ Attack: ${player.attack}
🛡️ Defense: ${player.defense}
💨 Speed: ${player.speed}
💰 Zeni: ${player.zeni}
🏆 Wins: ${player.wins || 0} | ☠️ Losses: ${player.losses || 0}
📋 Missions: ${player.missionsCompleted || 0}

*.dtrain* | *.dhunt* | *.dbattle @user*`;

      let buf = null;
      try {
        buf = await generateProfileScene({ ...player, rank });
      } catch (err) {
        console.error("DPROFILE canvas error:", err);
      }

      if (buf) {
        return sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: caption }, { quoted: msg });

    } catch (err) {
      console.error("DPROFILE ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load profile." }, { quoted: msg });
    }
  },
};
