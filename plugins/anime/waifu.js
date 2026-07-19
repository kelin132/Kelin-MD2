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
      const res = await fetch("https://api.waifu.im/search");
      const data = await res.json();

      const image = data.images[0].url;

      await sock.sendMessage(msg.key.remoteJid, {
        image: { url: image },
        caption: "🌸 Random Waifu — KELIN MD",
      });
    } catch (err) {
      console.error(err);

      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Failed to fetch waifu image.",
      });
    }
  },
};