/**
 * .staffs
 * List all staff members and their ranks.
 */
import { getStaffMembers } from "../economy/database.js";

const LEVEL_NAMES = { 1: "🔧 Mod", 2: "🛡️ Staff", 3: "👑 Admin", 99: "⚡ Owner" };

export default {
  name: "staffs",
  description: "List all staff members",
  category: "staff",
  usage: ".staffs",
  aliases: ["stafflist", "staffmembers"],

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const list   = await getStaffMembers();

    if (list.length === 0) {
      return sock.sendMessage(jid, {
        text: "📋 *Staff List*\n\nNo staff members found."
      }, { quoted: msg });
    }

    // Sort by level descending
    list.sort((a, b) => (b.staffLevel || 0) - (a.staffLevel || 0));

    const rows = list.map((u, i) => {
      const rank = LEVEL_NAMES[u.staffLevel] || "Unknown";
      const num  = u._id?.split("@")[0] || "?";
      return `${i + 1}. ${rank}  —  *${u.name || "Unknown"}*\n    └ +${num}`;
    });

    await sock.sendMessage(jid, {
      text:
        `🛡️ *Staff Members* (${list.length})\n` +
        `${"─".repeat(30)}\n\n` +
        rows.join("\n\n")
    }, { quoted: msg });
  }
};
