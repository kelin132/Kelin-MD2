import { askKimi } from "../../lib/omegatechKimi.mjs";

export default {
  name: "chatgpt",
  description: "Chat with Kimi AI via OmegaTech",
  category: "ai",
  usage: ".chatgpt <question>",
  aliases: ["gpt", "ai"],
  cooldown: 10,
  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .chatgpt <your question>" }, { quoted: msg });
    await sock.sendPresenceUpdate("composing", jid);
    try {
      const uid = sender?.split("@")[0] || jid;
      const reply = await askKimi(text, { uid, model: "chatgpt" });
      await sock.sendMessage(jid, { text: `💬\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
