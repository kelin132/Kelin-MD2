import axios from "axios";

export default {
  name: "neko",
  description: "Get a random anime neko image",
  category: "anime",
  usage: ".neko",
  aliases: ["catgirl"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg }) {
    try {
      const { data } = await axios.get(
        "https://api.waifu.pics/sfw/neko"
      );

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: data.url },
          caption: "🐱 Random Neko — KELIN MD",
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "❌ Failed to fetch neko image." },
        { quoted: msg }
      );
    }
  },
};