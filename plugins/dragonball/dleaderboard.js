// plugins/dragonball/dleaderboard.js
// Dragon Ball Z power leaderboard

import players from "../../lib/dragonball/players.js";
import { getRankName } from "../../lib/dragonball/utils.js";

export default {
  name: "dleaderboard",
  description: "Top Dragon Ball Z fighters ranked by power level",
  category: "dragonball",
  usage: ".dleaderboard",
  aliases: ["dtop", "dranking", "dboard"],
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const top = await players.getLeaderboard(10);

      if (!top.length) {
        return sock.sendMessage(jid, {
          text: "🐉 No fighters exist yet!\n\nBe the first — use *.dbzstart* to create your fighter.",
        }, { quoted: msg });
      }

      const medals = ["🥇", "🥈", "🥉"];
      const lines = [
        "🐉 *DRAGON BALL Z — POWER LEADERBOARD* 🐉",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "",
      ];

      top.forEach((p, i) => {
        const medal = medals[i] || `${i + 1}.`;
        const rank = getRankName(p.level);
        lines.push(`${medal} *${p.username}* — Lv ${p.level} (${rank})`);
        lines.push(`   🐉 ${p.character || "?"}  |  🏆 ${p.wins || 0}W  ☠️ ${p.losses || 0}L`);
        lines.push("");
      });

      lines.push("Use *.dprofile* to check your own rank!");

      return sock.sendMessage(jid, { text: lines.join("\n") }, { quoted: msg });

    } catch (err) {
      console.error("DLEADERBOARD ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load leaderboard." }, { quoted: msg });
    }
  },
};
