import axios from "axios";

export default {
  name: "hug",
  description: "Send a random anime hug image",
  category: "anime",
  usage: ".hug",
  aliases: ["animehug"],
  cooldown: 5,

  async run({ sock, msg }) {
    try {
      const { data } = await axios.get(
        "https://api.waifu.pics/sfw/hug"
      );

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: data.url },
          caption: "🤗 Anime Hug — KELIN MD"
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error("Hug Error:", err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to fetch hug image."
        },
        { quoted: msg }
      );
    }
  }
};