// plugins/naruto/njutsu.js
// View your learned jutsu — shows character art based on most powerful jutsu

import players from "../../lib/naruto/players.js";
import { sendWithClanImage, sendWithNarutoTheme } from "../../lib/gifHelper.mjs";

export default {
  name: "njutsu",
  description: "View your learned jutsu",
  category: "naruto",
  usage: ".njutsu",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    try {
      const player = await players.get(sender);

      if (!player) {
        return sock.sendMessage(jid, {
          text: "🥷 You don't have a ninja profile.\n\nUse .nstart first."
        }, { quoted: msg });
      }

      const jutsuList = Array.isArray(player.jutsu) && player.jutsu.length
        ? player.jutsu.map((j, i) => {
            const id = typeof j === "string" ? j : j.id;
            const name = typeof j === "string" ? j : j.name;
            return `${i + 1}. 🌀 *${name}* \`[${id}]\``;
          }).join("\n")
        : "You haven't learned any jutsu yet.\n\nUse .nlearn to see available techniques.";

      const caption =
`🌀 *JUTSU LIST*

🥷 ${player.username}
👁️ Clan: ${player.clan?.name || "None"}

${jutsuList}

💡 Use *.nlearn <jutsu_id>* to learn new techniques.`;

      // Show clan-appropriate character image (they know the jutsu of their clan)
      if (player.clan?.name) {
        return sendWithClanImage(sock, jid, msg, caption, player.clan.name, "jutsu");
      }
      return sendWithNarutoTheme(sock, jid, msg, caption, "jutsu");

    } catch (err) {
      console.error("NJUTSU ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load jutsu." }, { quoted: msg });
    }
  }
};
