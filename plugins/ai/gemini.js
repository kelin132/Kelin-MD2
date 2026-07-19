import { askGemini } from "../../lib/gemini.mjs";

export default {
  name: "gemini",
  description: "Chat with Google Gemini AI",
  category: "ai",
  usage: ".gemini <question>",
  aliases: ["gem"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "2.0.0",
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .gemini <your question>" });
    await sock.sendMessage(jid, { text: "🤖 Thinking..." });
    try {
      const reply = await askGemini(text);
      await sock.sendMessage(jid, { text: `🤖 *Gemini:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` });
    }
  },
};
