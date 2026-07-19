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
      const res = await fetch("https://publicapi.dev/waifu-pics-api");
      const data = await res.json();
      await sock.sendMessage(msg.key.remoteJid, {
        image: { url: data.url },
        caption: "🌸 Random Waifu — KELIN MD",
      });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: "Failed to fetch waifu image." });
    }
  },
};
