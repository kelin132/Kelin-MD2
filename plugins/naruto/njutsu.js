// plugins/naruto/njutsu.js

import players from "../../lib/naruto/players.js";
import { sendWithGif } from "../../lib/gifHelper.mjs";

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
        ? player.jutsu.map((j, i) => `${i + 1}. 🌀 *${j.name}*`).join("\n")
        : "You haven't learned any jutsu yet.\n\nUse .nlearn to see available techniques.";

      return sendWithGif(sock, jid, msg,
`🌀 *JUTSU LIST*

🥷 ${player.username}

${jutsuList}

💡 Use *.nlearn <jutsu_id>* to learn new techniques.`, "naruto jutsu chakra");

    } catch (err) {
      console.error("NJUTSU ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load jutsu." }, { quoted: msg });
    }
  }
};
