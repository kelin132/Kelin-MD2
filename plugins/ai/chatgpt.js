export default {
  name: "chatgpt",
  description: "Chat with ChatGPT AI",
  category: "ai",
  usage: ".chatgpt <prompt>",
  aliases: ["gpt", "ai"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .chatgpt <your question>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: "ChatGPT requires an OpenAI API key. Set it in dashboard Settings > API Keys.",
    });
  },
};
