import axios from "axios";

export default {
  name: "waifu",
  description: "Get a random anime waifu image",
  category: "anime",
  usage: ".waifu",
  aliases: ["anime"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg }) {
    try {
      const { data } = await axios.get(
        "https://api.waifu.pics/sfw/waifu"
      );

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: data.url },
          caption: "🌸 Random Waifu — KELIN MD",
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to fetch waifu image.",
        },
        { quoted: msg }
      );
    }
  },
};