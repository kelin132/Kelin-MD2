import { getDb } from "../../lib/mongo.mjs";
import {
  getWhatsAppParticipantId,
  lotteryDisplayName,
  lotteryWinnerIdentity,
} from "../../lib/lotteryAutoDraw.mjs";

export default {
  name: "lotterylist",
  aliases: ["lottolist", "tickets"],
  category: "economy",
  cooldown: 6,
  description: "View current lottery participants and ticket counts",
  usage: ".lotterylist",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const db = getDb();
      const lot = await db.collection("lottery").findOne({ _id: "current" });
      if (!lot || !Array.isArray(lot.tickets) || !lot.tickets.length) {
        return reply([
          "╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 〕━━━╮",
          "┃ ✦ No tickets bought yet!",
          "┃",
          "┃ 💡 Be the first — .lottery buy",
          "╰━━━━━━━━━━━━━━━━━━━━╯",
        ].join("\n"));
      }

      const sorted = [...lot.tickets].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
      const identities = [...new Set(sorted.map((ticket) => lotteryWinnerIdentity(ticket)).filter(Boolean))];
      const profiles = identities.length
        ? await db.collection("users").find({ _id: { $in: identities } }, { projection: { name: 1 } }).toArray()
        : [];
      const names = new Map(profiles.map((profile) => [String(profile._id), String(profile.name || "").trim()]));
      const totalTickets = Number(lot.totalTickets || sorted.reduce((sum, ticket) => sum + (Number(ticket.count) || 0), 0));
      const mentions = [];
      const rows = sorted.map((ticket, index) => {
        const identity = lotteryWinnerIdentity(ticket);
        const whatsappJid = getWhatsAppParticipantId(ticket.userId);
        const name = names.get(identity) || lotteryDisplayName(ticket);
        const player = whatsappJid
          ? "@" + whatsappJid.split("@")[0] + " (" + name + ")"
          : name;
        if (whatsappJid) mentions.push(whatsappJid);
        const chance = totalTickets > 0 ? ((Number(ticket.count || 0) / totalTickets) * 100).toFixed(1) : "0.0";
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : String(index + 1) + ".";
        return "┃ " + medal + " " + player + " › " + Number(ticket.count || 0) + " ticket(s) · " + chance + "%";
      });
      const response = [
        "╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑳𝑰𝑺𝑻 🎟️ 〕━━━╮",
        "┃ ✦ Current round participants",
        "┃",
        "┃ 💰 Jackpot › $" + Number(lot.jackpot || 0).toLocaleString(),
        "┃ 🎫 Tickets › " + totalTickets + " total",
        "┣━━━━━━━━━━━━━━━━━━━━",
        ...rows,
        "┣━━━━━━━━━━━━━━━━━━━━",
        "┃ 💡 .lottery buy to join",
        "╰━━━━━━━━━━━━━━━━━━━━╯",
      ].join("\n");
      return sock.sendMessage(jid, { text: response, mentions: [...new Set(mentions)] }, { quoted: msg });
    } catch (error) {
      console.error("LOTTERYLIST ERROR:", error);
      return reply("❌ Failed to load lottery.");
    }
  },
};
