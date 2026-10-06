import { getDb } from "../../lib/mongo.mjs";
import {
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
      
      // Clean numeric IDs to search the database
      const identities = [...new Set(sorted.map((ticket) => {
        const rawId = lotteryWinnerIdentity(ticket) || ticket.userId;
        return rawId ? String(rawId).split("@")[0].split(":")[0] : null;
      }).filter(Boolean))];

      const profiles = identities.length
        ? await db.collection("users").find({
            $or: [
              { _id: { $in: identities } },
              { _id: { $in: identities.map(id => `${id}@s.whatsapp.net`) } },
              { _id: { $in: identities.map(id => `${id}@lid`) } }
            ]
          }, { projection: { name: 1, username: 1 } }).toArray()
        : [];

      const names = new Map();
      for (const profile of profiles) {
        const cleanId = String(profile._id).split("@")[0].split(":")[0];
        const displayName = String(profile.name || profile.username || "").trim();
        if (displayName) names.set(cleanId, displayName);
      }

      const totalTickets = Number(lot.totalTickets || sorted.reduce((sum, ticket) => sum + (Number(ticket.count) || 0), 0));

      const rows = sorted.map((ticket, index) => {
        const rawIdentity = lotteryWinnerIdentity(ticket) || ticket.userId || "";
        const cleanIdentity = String(rawIdentity).split("@")[0].split(":")[0];

        // Resolve clean display name without any raw LID/phone formatting
        const savedName = names.get(cleanIdentity);
        let fallbackName = lotteryDisplayName(ticket);

        if (fallbackName && (fallbackName.includes("@lid") || /^\d+$/.test(fallbackName))) {
          fallbackName = `User_${cleanIdentity.slice(-4)}`;
        }

        const player = savedName || fallbackName || `User_${cleanIdentity.slice(-4)}`;
        const chance = totalTickets > 0 ? ((Number(ticket.count || 0) / totalTickets) * 100).toFixed(1) : "0.0";
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;

        return [
          `${medal} *${player}*`,
          `🎫 Tickets: ${Number(ticket.count || 0)}`,
          `📊 Chance: ${chance}%`,
        ].join("\n");
      });

      const response = [
        "ㅤㅤ∘]───❀───[∘",
        "*∘₊✧ LOTTERY LIST* ❀",
        "      ∘]───❀───[∘",
        "",
        `𝗧𝗶𝗰𝗸𝗲𝘁𝘀: ${totalTickets} total`,
        "",
        "━━━━━━━━━━━━━━━",
        rows.join("\n\n"),
        "━━━━━━━━━━━━━━━",
        "_Use .lottery buy to join_",
      ].join("\n");

      return reply(response);
    } catch (error) {
      console.error("LOTTERYLIST ERROR:", error);
      return reply("❌ Failed to load lottery.");
    }
  },
};
