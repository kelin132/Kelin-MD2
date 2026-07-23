// plugins/anime/animenews.js
// Top trending anime via David Cyril Trending API

import { getTrendingAnime } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "animenews",
  aliases: ["trending", "animetrend", "topanime"],
  description: "Get top trending anime right now",
  category: "anime",
  usage: ".animenews",
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const list = await getTrendingAnime();

      if (!list.length) {
        return sock.sendMessage(jid, {
          text: "❌ No trending anime found. Try again later.",
        }, { quoted: msg });
      }

      const top = list.slice(0, 10);

      let txt = "🌟 *TOP TRENDING ANIME RIGHT NOW* 🌟\n\n";
      top.forEach((a) => {
        const name   = a.title_english || a.title;
        const eps    = a.episodes ? `${a.episodes} eps` : "Ongoing";
        const score  = a.score ? `⭐ ${a.score}` : "";
        const genres = a.genres?.slice(0, 3).join(", ") || "";
        txt += `#${a.rank} *${name}*\n   🎬 ${eps}${score ? "  " + score : ""}${genres ? "\n   🎭 " + genres : ""}\n\n`;
      });

      const cover = top[0]?.image;
      if (cover) {
        await sock.sendMessage(jid, { image: { url: cover }, caption: txt.trim() }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
      }

    } catch (err) {
      await sock.sendMessage(jid, {
        text: "❌ Failed to fetch trending anime. Try again later.",
      }, { quoted: msg });
    }
  },
};
