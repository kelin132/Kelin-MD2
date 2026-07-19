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
      const res = await axios.get("https://api.waifu.pics/sfw/waifu");

      if (!res.data?.url) {
        throw new Error("No image URL found");
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: res.data.url },
          caption: "🌸 Random Waifu — AKIRA ",
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error("Waifu Error:", err);

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