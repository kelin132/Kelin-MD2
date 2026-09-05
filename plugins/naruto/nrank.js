// plugins/naruto/nrank.js
// View ninja rank and promotion progress — shows rank-appropriate character art

import players from "../../lib/naruto/players.js";
import ranks   from "../../lib/naruto/ranks.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

// Rank → iconic character for that rank
const RANK_CHARACTERS = {
  "Academy Student": "Naruto Uzumaki",
  "Genin":           "Naruto Uzumaki",
  "Chunin":          "Shikamaru Nara",
  "Special Jonin":   "Kakashi Hatake",
  "Jonin":           "Kakashi Hatake",
  "ANBU":            "Itachi Uchiha",
  "Kage":            "Minato Namikaze",
  "Legendary Shinobi": "Hashirama Senju",
};

export default {
  name: "nrank",
  description: "View ninja rank and promotion progress",
  category: "naruto",
  usage: ".nrank",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const currentIndex = ranks.findIndex(r => r.name === player.rank);
      const nextRank     = ranks[currentIndex + 1];

      let progress;
      if (nextRank) {
        const pct = Math.min(100, Math.floor((player.level / nextRank.level) * 100));
        const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
        progress =
`🎯 Next Rank: *${nextRank.name}*
Required Level: ${nextRank.level}
Your Level: ${player.level}
Progress: [${bar}] ${pct}%`;
      } else {
        progress = "🏆 You have reached the *highest rank!*\nYou are a Legendary Shinobi.";
      }

      const charName = RANK_CHARACTERS[player.rank || "Academy Student"] || "Naruto Uzumaki";

      return sendWithCharacterImage(sock, jid, msg,
`🎖️ *NINJA RANK*

🥷 ${player.username}
🏯 ${player.village?.emoji || ""} ${player.village?.name || "None"}
👁️ Clan: ${player.clan?.name || "None"}

🏅 Current Rank: *${player.rank || "Academy Student"}*

${progress}`,
        charName, "rank");

    } catch (err) {
      console.error("NRANK ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to check rank." }, { quoted: msg });
    }
  }
};
