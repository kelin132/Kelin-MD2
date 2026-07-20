import axios from "axios";

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
      const { data } = await axios.get("https://api.jikan.moe/v4/top/anime?filter=airing&limit=5");
      if (!data.data?.length) return sock.sendMessage(jid, { text: "❌ No trending anime found." }, { quoted: msg });

      let txt = "🌟 *TOP TRENDING ANIME RIGHT NOW* 🌟\n\n";
      data.data.forEach((anime, i) => {
        txt += `${i + 1}. 📺 *${anime.title}*\n   ⭐ Score: ${anime.score || "N/A"} | 🎬 Eps: ${anime.episodes || "?"}\n   🔗 ${anime.url}\n\n`;
      });
      await sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch anime news. Try again later." }, { quoted: msg });
    }
  },
};
