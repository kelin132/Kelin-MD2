import { askKimi } from "../../lib/omegatechKimi.mjs";

export default {
  name: "deepseek",
  description: "Deep analytical AI via OmegaTech Kimi",
  category: "ai",
  usage: ".deepseek <question>",
  aliases: ["deep", "ds"],
  cooldown: 10,
  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .deepseek <your question>" }, { quoted: msg });
    await sock.sendPresenceUpdate("composing", jid);
    try {
      const uid = sender?.split("@")[0] || jid;
      const reply = await askKimi(text, { uid, model: "deepseek" });
      await sock.sendMessage(jid, { text: `🔬 *Kimi:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
