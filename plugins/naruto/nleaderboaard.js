// plugins/naruto/nleaderboard.js
// Top ninjas leaderboard — shows Naruto (the strongest) at the top

import players from "../../lib/naruto/players.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

export default {
  name: "nleaderboard",
  description: "Top ninjas leaderboard",
  category: "naruto",
  usage: ".nlb",
  aliases: ["ntop", "nrankings"],

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const all = await players.getAll();

      if (!all || !all.length) {
        return sock.sendMessage(jid, {
          text: "📊 No ninjas registered yet.\n\nUse .nstart to be the first!"
        }, { quoted: msg });
      }

      const sorted = [...all].sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 10);

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

      const list = sorted.map((p, i) =>
`${medals[i]} *${p.username}*
⭐ Lv ${p.level} | ${p.rank || "Academy Student"} | 🏆 ${p.wins || 0}W | 💰 ${(p.ryo || 0).toLocaleString()} Ryo`
      ).join("\n\n");

      return sendWithCharacterImage(sock, jid, msg,
`🏆 *NINJA LEADERBOARD*

${list}

Keep training to reach the top!`,
        "Naruto Uzumaki", "leaderboard");

    } catch (err) {
      console.error("NLEADERBOARD ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load leaderboard." }, { quoted: msg });
    }
  }
};
