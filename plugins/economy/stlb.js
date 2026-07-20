import { getStaffMembers } from "./database.js";

const LEVEL_LABELS = { 1: "🛡️ Mod", 2: "⭐ Staff", 3: "👑 Admin" };

export default {
  name: "stlb",
  aliases: ["stafflb", "staffboard"],
  category: "economy",
  description: "View the staff leaderboard",
  usage: ".stlb",

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    try {
      const staff = await getStaffMembers();

      if (!staff.length) return reply("📋 No staff members registered yet.");

      const sorted = [...staff].sort((a, b) => (b.staffLevel || 0) - (a.staffLevel || 0));
      const medals = ["🥇", "🥈", "🥉"];

      let text = "🛡️ *STAFF LEADERBOARD*\n\n";
      sorted.forEach((s, i) => {
        const rank  = medals[i] || `${i + 1}.`;
        const label = LEVEL_LABELS[s.staffLevel] || "🛡️ Staff";
        text += `${rank} *${s.name || s._id}*\n   ${label}\n\n`;
      });

      return reply(text);
    } catch (err) {
      console.error("STLB ERROR:", err);
      return reply("❌ Failed to load staff leaderboard.");
    }
  },
};
