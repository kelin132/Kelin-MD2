// plugins/naruto/nprofile.js
// Shows the ninja profile with real character art from Dattebayo API

import players from "../../lib/naruto/players.js";
import { sendWithClanImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

export default {
  name: "nprofile",
  description: "View your Naruto ninja profile",
  category: "naruto",
  usage: ".nprofile",
  aliases: ["ninja", "ncard"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const player = await players.get(sender);

    if (!player) {
      return sock.sendMessage(jid, {
        text: "🥷 You don't have a ninja profile.\n\nUse .nstart to create your ninja."
      }, { quoted: msg });
    }

    const caption =
`🍃 *NINJA PROFILE*

🥷 Name: ${player.username}
🏯 Village: ${player.village?.emoji || ""} ${player.village?.name || "None"}
👁️ Clan: ${player.clan?.name || "None"}
🎖 Rank: ${player.rank || "Academy Student"}
⭐ Level: ${player.level}
✨ XP: ${player.xp}/${player.xpNeeded}
❤️ HP: ${player.hp}/${player.maxHp}
💙 Chakra: ${player.chakra}/${player.maxChakra}
⚔️ Attack: ${player.attack}
🛡️ Defense: ${player.defense}
💨 Speed: ${player.speed}
💰 Ryo: ${player.ryo}
🏆 Wins: ${player.wins || 0} | ☠️ Losses: ${player.losses || 0}`;

    // Use real character art based on clan — falls back to static Naruto image
    const clanName = player.clan?.name;
    if (clanName) {
      return sendWithClanImage(sock, jid, msg, caption, clanName, "profile");
    }
    return sendWithNarutoTheme(sock, jid, msg, caption, "profile");
  },
};
