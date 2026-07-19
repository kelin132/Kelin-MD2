import { askDeepSeek } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "deepseek",
  description: "Deep analytical AI (DeepSeek R1)",
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
      const reply = await askDeepSeek(text, uid);
      await sock.sendMessage(jid, { text: `🔬 *DeepSeek R1:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
