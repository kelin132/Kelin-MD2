import axios from "axios";

export default {
  name: "animerec",
  aliases: ["recommend", "anirec"],
  description: "Get anime recommendations (optionally based on an anime you like)",
  category: "anime",
  usage: ".animerec [anime name]",
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    try {
      let url = "https://api.jikan.moe/v4/recommendations/anime";
      if (text) {
        const { data: search } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        if (search.data?.length) url = `https://api.jikan.moe/v4/anime/${search.data[0].mal_id}/recommendations`;
      }
      const { data } = await axios.get(url);
      if (!data.data?.length) return sock.sendMessage(jid, { text: "❌ No recommendations found." }, { quoted: msg });

      const limit = 5;
      let txt = text ? `🎬 *BECAUSE YOU LIKE ${text.toUpperCase()}* 🎬\n\n` : "🎬 *ANIME RECOMMENDATIONS* 🎬\n\n";
      data.data.slice(0, limit).forEach((item, i) => {
        const rec = text ? item.entry : item.entry[0];
        txt += `${i + 1}. *${rec.title}*\n`;
        if (text && item.votes) txt += `   👍 Votes: ${item.votes}\n`;
      });
      await sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch recommendations. Try again later." }, { quoted: msg });
    }
  },
};
