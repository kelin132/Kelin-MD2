export default {
  name: "google",
  description: "Search Google and get top results",
  category: "search",
  usage: ".google <query>",
  aliases: ["g", "search"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .google <search query>" });
      return;
    }
    const encoded = encodeURIComponent(text);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🔍 Search results for: "${text}"\n\nhttps://www.google.com/search?q=${encoded}`,
    });
  },
};
