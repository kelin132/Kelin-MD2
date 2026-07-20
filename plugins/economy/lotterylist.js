import { getDb } from "../../lib/mongo.mjs";

export default {
  name: "lotterylist",
  aliases: ["lottolist", "tickets"],
  category: "economy",
  description: "View current lottery participants and ticket counts",
  usage: ".lotterylist",

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const db  = getDb();
      const lot = await db.collection("lottery").findOne({ _id: "current" });

      if (!lot || !lot.tickets?.length) {
        return reply("🎰 *LOTTERY*\n\nNo tickets bought yet! Be the first with *.lottery buy*");
      }

      const sorted = [...lot.tickets].sort((a, b) => b.count - a.count);
      let text = `🎰 *CURRENT LOTTERY*\n\n💰 Jackpot: $${lot.jackpot.toLocaleString()}\n🎫 Total Tickets: ${lot.totalTickets}\n\n*Participants:*\n`;

      sorted.forEach((t, i) => {
        const chance = ((t.count / lot.totalTickets) * 100).toFixed(1);
        text += `${i + 1}. *${t.name}* — ${t.count} ticket(s) (${chance}% chance)\n`;
      });

      text += "\n📌 Buy tickets: *.lottery buy <n>*";

      return reply(text);
    } catch (err) {
      console.error("LOTTERYLIST ERROR:", err);
      return reply("❌ Failed to load lottery.");
    }
  },
};
