import axios from "axios";

export default {
  name: "airing",
  aliases: ["nextep", "airingtime"],
  description: "Check when the next episode of a currently-airing anime airs",
  category: "anime",
  usage: ".airing <anime name>",
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "❌ Provide an anime name.\n\nExample: .airing One Piece" }, { quoted: msg });

    try {
      const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&status=airing&limit=1`);
      if (!data.data?.length) return sock.sendMessage(jid, { text: `❌ No currently-airing anime found for "${text}".` }, { quoted: msg });

      const anime = data.data[0];
      if (anime.status !== "Currently Airing") return sock.sendMessage(jid, { text: `ℹ️ *${anime.title}* is not currently airing.\nStatus: ${anime.status}` }, { quoted: msg });

      const txt = `📺 *${anime.title}*\n\n💫 Status: ${anime.status}\n🎬 Episodes: ${anime.episodes || "Ongoing"}\n⭐ Score: ${anime.score || "N/A"}\n📅 Aired: ${anime.aired.string || "Unknown"}\n\n🔗 ${anime.url}`;
      await sock.sendMessage(jid, { image: { url: anime.images.jpg.large_image_url }, caption: txt }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch airing info. Try again later." }, { quoted: msg });
    }
  },
};
