import { askGemini } from "../../lib/gemini.mjs";

export default {
  name: "gemini",
  description: "Chat with Google Gemini AI",
  category: "ai",
  usage: ".gemini <question>",
  aliases: ["gem"],
  cooldown: 10,
  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .gemini <your question>" }, { quoted: msg });
    await sock.sendPresenceUpdate("composing", jid);
    try {
      const uid = sender?.split("@")[0] || jid;
      const reply = await askGemini(text, { uid });
      await sock.sendMessage(jid, { text: `🤖 *Gemini:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
