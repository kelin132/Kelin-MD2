export default {
  name: "gemini",
  description: "Chat with Google Gemini AI",
  category: "ai",
  usage: ".gemini <prompt>",
  aliases: ["gem"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .gemini <your question>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: "Gemini requires a Google API key. Set it in dashboard Settings > API Keys.",
    });
  },
};
