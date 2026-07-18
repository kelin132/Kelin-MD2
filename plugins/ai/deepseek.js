export default {
  name: "deepseek",
  description: "Chat with DeepSeek AI for code generation",
  category: "ai",
  usage: ".deepseek <prompt>",
  aliases: ["ds", "code"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .deepseek <prompt>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: "DeepSeek requires an API key. Configure it in Settings.",
    });
  },
};
