// plugins/anime/animeinfo.js
// Search anime info via David Cyril AnimeIndo Search API

import { searchAnimeIndo } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "anime",
  description: "Search anime information",
  category: "anime",
  usage: ".anime <anime name>",
  aliases: ["animeinfo", "ani"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide an anime name.\n\nExample:\n.anime Naruto",
      }, { quoted: msg });
    }

    try {
      const results = await searchAnimeIndo(text);

      if (!results.length) {
        return sock.sendMessage(jid, {
          text: `❌ No anime found for *"${text}"*.`,
        }, { quoted: msg });
      }

      const anime = results[0];
      const synopsis = (anime.description || "No synopsis available.").slice(0, 600);
      const synopsisText = (anime.description || "").length > 600 ? synopsis + "..." : synopsis;

      const caption =
`🎌 *${anime.title}*

🎬 Type: ${anime.status || "Unknown"}

📝 *Synopsis:*
${synopsisText}

🔗 ${anime.url}`;

      await sock.sendMessage(jid, {
        image: { url: anime.thumbnail },
        caption,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: "❌ Failed to fetch anime information. Try again later.",
      }, { quoted: msg });
    }
  },
};
