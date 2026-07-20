import axios from "axios";

export default {
  name: "animequote",
  aliases: ["aquote", "aniquote"],
  description: "Get a random anime quote",
  category: "anime",
  usage: ".animequote",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const { data } = await axios.get("https://yurippe.vercel.app/api/quotes?random=1");
      const quote = Array.isArray(data) ? data[0] : data;
      await sock.sendMessage(jid, {
        text: `💬 *"${quote.quote}"*\n\n👤 *Character:* ${quote.character}\n📺 *Anime:* ${quote.show}`
      }, { quoted: msg });
    } catch {
      // fallback quotes
      const fallback = [
        { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", character: "Kenshin Himura", show: "Rurouni Kenshin" },
        { quote: "Power comes in response to a need, not a desire.", character: "Goku", show: "Dragon Ball Z" },
        { quote: "The world is not beautiful, therefore it is.", character: "Kino", show: "Kino's Journey" },
      ];
      const q = fallback[Math.floor(Math.random() * fallback.length)];
      await sock.sendMessage(jid, {
        text: `💬 *"${q.quote}"*\n\n👤 *Character:* ${q.character}\n📺 *Anime:* ${q.show}`
      }, { quoted: msg });
    }
  },
};
