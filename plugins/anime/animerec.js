// plugins/anime/animerec.js
// Anime recommendations powered by David Cyril Trending API
// Optionally filter by genre or keyword

import { getTrendingAnime } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "animerec",
  aliases: ["recommend", "anirec"],
  description: "Get anime recommendations (optionally filter by genre/keyword)",
  category: "anime",
  usage: ".animerec [genre or keyword]",
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    try {
      const list = await getTrendingAnime();

      if (!list.length) {
        return sock.sendMessage(jid, { text: "❌ No recommendations found. Try again later." }, { quoted: msg });
      }

      const query = text?.toLowerCase().trim();
      const filtered = query
        ? list.filter(a =>
            a.title?.toLowerCase().includes(query) ||
            a.title_english?.toLowerCase().includes(query) ||
            a.genres?.some(g => g.toLowerCase().includes(query))
          )
        : list;

      const picks = (filtered.length ? filtered : list).slice(0, 5);

      let txt = query
        ? `🎬 *ANIME RECS — "${text}"* 🎬\n\n`
        : "🎬 *ANIME RECOMMENDATIONS* 🎬\n\n";

      picks.forEach((a, i) => {
        const name   = a.title_english || a.title;
        const eps    = a.episodes ? `${a.episodes} eps` : "Ongoing";
        const score  = a.score ? `⭐ ${a.score}` : "";
        const genres = a.genres?.slice(0, 3).join(", ") || "";
        txt += `${i + 1}. *${name}*\n   🎬 ${eps}${score ? "  " + score : ""}${genres ? "\n   🎭 " + genres : ""}\n\n`;
      });

      if (query && !filtered.length) {
        txt += `_No exact match for "${text}" — showing top picks instead_\n`;
      }

      const cover = picks[0]?.image;
      if (cover) {
        await sock.sendMessage(jid, { image: { url: cover }, caption: txt.trim() }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
      }

    } catch (err) {
      await sock.sendMessage(jid, {
        text: "❌ Failed to fetch recommendations. Try again later.",
      }, { quoted: msg });
    }
  },
};
