import { askGemini } from "../../lib/gemini.mjs";

const SYSTEM = `You are Akira, the personal AI assistant of KELIN MD WhatsApp bot. Your personality:
- Name: Akira
- Personality: Friendly, witty, slightly sarcastic but always helpful
- Speaking style: Casual, uses emojis naturally, speaks like a cool friend
- You are loyal to KELIN MD and its owner
- Keep responses short and punchy unless asked for detail
- Never break character — you ARE Akira, not an AI model`;

export default {
  name: "akira",
  description: "Chat with Akira, KELIN MD's personal AI",
  category: "ai",
  usage: ".akira <message>",
  aliases: ["aki"],
  cooldown: 8,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .akira <message>\n\nSay hi to Akira! 👋" });
    await sock.sendMessage(jid, { text: "✨ Akira is thinking..." });
    try {
      const reply = await askGemini(text, SYSTEM);
      await sock.sendMessage(jid, { text: `✨ *Akira:*\n\n${reply}` }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` });
    }
  },
};
