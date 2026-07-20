import axios from "axios";

export default {
  name: "manga",
  aliases: ["mangainfo", "mng"],
  description: "Search manga information from MyAnimeList",
  category: "anime",
  usage: ".manga <manga name>",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "❌ Provide a manga name.\n\nExample: .manga One Piece" }, { quoted: msg });

    try {
      const { data } = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(text)}&limit=1`);
      if (!data.data.length) return sock.sendMessage(jid, { text: "❌ No manga found with that name." }, { quoted: msg });

      const manga = data.data[0];
      const caption = `📕 *${manga.title}*\n\n📚 Type: ${manga.type || "Unknown"}\n⭐ Score: ${manga.score || "N/A"}\n📑 Chapters: ${manga.chapters || "Unknown"}\n📰 Volumes: ${manga.volumes || "Unknown"}\n📅 Published: ${manga.published.string || "Unknown"}\n💫 Status: ${manga.status || "Unknown"}\n\n📝 *Synopsis:*\n${manga.synopsis || "No synopsis available."}\n\n🔗 ${manga.url}`;

      await sock.sendMessage(jid, { image: { url: manga.images.jpg.large_image_url }, caption }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch manga info. Try again later." }, { quoted: msg });
    }
  },
};
