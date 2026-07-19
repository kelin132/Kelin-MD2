import { askGemini } from "../../lib/gemini.mjs";

const SYSTEM = "You are DeepSeek, an analytical and highly technical AI. Provide thorough, structured, and detailed answers. Use bullet points and sections when helpful.";

export default {
  name: "deepseek",
  description: "Deep analytical AI responses",
  category: "ai",
  usage: ".deepseek <question>",
  aliases: ["deep", "ds"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "2.0.0",
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .deepseek <your question>" });
    await sock.sendMessage(jid, { text: "🔬 Analyzing..." });
    try {
      const reply = await askGemini(text, SYSTEM);
      await sock.sendMessage(jid, { text: `🔬 *DeepSeek:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` });
    }
  },
};
