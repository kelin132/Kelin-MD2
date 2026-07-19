import axios from "axios";

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
      return sock.sendMessage(
        jid,
        {
          text: "❌ Please provide an anime name.\n\nExample:\n.anime Naruto",
        },
        { quoted: msg }
      );
    }

    try {
      const { data } = await axios.get(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`
      );

      if (!data.data.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ No anime found." },
          { quoted: msg }
        );
      }

      const anime = data.data[0];

      const genres = anime.genres.length
        ? anime.genres.map(g => g.name).join(", ")
        : "Unknown";

      const caption = `🎌 *${anime.title}*

📺 Episodes: ${anime.episodes || "Unknown"}
🎭 Type: ${anime.type || "Unknown"}
⭐ Score: ${anime.score || "N/A"}
❤️ Rating: ${anime.rating || "Unknown"}
🎬 Status: ${anime.status || "Unknown"}
📅 Aired: ${anime.aired.string || "Unknown"}
🎯 Genres: ${genres}
👥 Members: ${anime.members.toLocaleString()}

📝 *Synopsis:*
${anime.synopsis || "No synopsis available."}

🔗 ${anime.url}`;

      await sock.sendMessage(
        jid,
        {
          image: { url: anime.images.jpg.large_image_url },
          caption,
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ Failed to fetch anime information.",
        },
        { quoted: msg }
      );
    }
  },
};