import { askGemini } from "../../lib/gemini.mjs";

const SYSTEM = "You are ChatGPT, a helpful, concise, and friendly AI assistant by OpenAI. Answer clearly and directly.";

export default {
  name: "chatgpt",
  description: "Chat with AI (powered by Gemini)",
  category: "ai",
  usage: ".chatgpt <question>",
  aliases: ["gpt", "ai"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "2.0.0",
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .chatgpt <your question>" });
    await sock.sendMessage(jid, { text: "💬 Thinking..." });
    try {
      const reply = await askGemini(text, SYSTEM);
      await sock.sendMessage(jid, { text: `💬 *ChatGPT:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` });
    }
  },
};
