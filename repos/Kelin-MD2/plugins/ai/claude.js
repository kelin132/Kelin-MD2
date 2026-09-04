import { askKimi } from "../../lib/omegatechKimi.mjs";

export default {
  name: "claude",
  description: "Chat with Claude AI via OmegaTech",
  category: "ai",
  usage: ".claude <question>",
  aliases: ["cl"],
  cooldown: 10,
  async run({ sock, msg, text, sender }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .claude <your question>" }, { quoted: msg });
    await sock.sendPresenceUpdate("composing", jid);
    try {
      const uid = sender?.split("@")[0] || jid;
      const reply = await askKimi(text, { uid, model: "claude" });
      await sock.sendMessage(jid, { text: `📜 *Claude:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};
