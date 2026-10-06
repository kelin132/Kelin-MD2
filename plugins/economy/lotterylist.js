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
          "ㅤㅤ∘]───❀───[∘",
          "*∘₊✧ LOTTERY LIST* ❀",
          "      ∘]───❀───[∘",
          "",
          "𝗧𝗶𝗰𝗸𝗲𝘁𝘀: 0 total",
          "",
          "━━━━━━━━━━━━━━━",
          "No tickets bought yet!",
          "━━━━━━━━━━━━━━━",
          "_Use .lottery buy to join_",
        ].join("\n"));
      }

      const sorted = [...lot.tickets].sort((a, b) => Number(b.count || 0) - Number(a.count || 0));
      
      // Clean up identity keys (strip @s.whatsapp.net / @lid) for reliable DB matching
      const identities = [...new Set(sorted.map((ticket) => {
        const rawId = lotteryWinnerIdentity(ticket);
        return rawId ? String(rawId).split("@")[0] : null;
      }).filter(Boolean))];

      // Match users by either raw number ID, full JID, or LID in MongoDB
      const profiles = identities.length
        ? await db.collection("users").find({
            $or: [
              { _id: { $in: identities } },
              { _id: { $in: identities.map(id => `${id}@s.whatsapp.net`) } },
              { _id: { $in: identities.map(id => `${id}@lid`) } }
            ]
          }, { projection: { name: 1, username: 1 } }).toArray()
        : [];

      // Build name lookup map using clean numeric IDs
      const names = new Map();
      for (const profile of profiles) {
        const cleanId = String(profile._id).split("@")[0];
        const displayName = String(profile.name || profile.username || "").trim();
        if (displayName) names.set(cleanId, displayName);
      }

      const totalTickets = Number(lot.totalTickets || sorted.reduce((sum, ticket) => sum + (Number(ticket.count) || 0), 0));
      const mentions = [];

      const rows = sorted.map((ticket, index) => {
        const rawIdentity = lotteryWinnerIdentity(ticket);
        const cleanIdentity = rawIdentity ? String(rawIdentity).split("@")[0] : "";
        const whatsappJid = getWhatsAppParticipantId(ticket.userId) || "";
        
        
