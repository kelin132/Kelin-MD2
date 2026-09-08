// plugins/naruto/nleaderboard.js
// Top ninjas leaderboard — shows Naruto (the strongest) at the top

import players from "../../lib/naruto/players.js";
import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";
import { getCachedLeaderboard } from "../../lib/leaderboardCache.mjs";

export default {
  name: "nlb",
  description: "Top ninjas leaderboard",
  category: "naruto",
  usage: ".nlb",
  aliases: ["ntop", "nrankings"],

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const top = await getCachedLeaderboard(
        "naruto:leaderboard",
        () => players.getTop(10),
        { ttlMs: 30_000 },
      );

      if (!top.length) {
        return sock.sendMessage(jid, {
          text: "📊 No ninjas registered yet.\n\nUse .nstart to be the first!"
        }, { quoted: msg });
      }

      const db = await getDb();
      const jids = top.map((player) => normalizeJid(player.jid)).filter(Boolean);
      const users = await db.collection("users").find(
        { _id: { $in: jids } },
        { projection: { _id: 1, name: 1 } },
      ).toArray();
      const names = new Map(users.map((user) => [String(user._id), user.name]));

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

       const list = top.map((p, i) =>
 `${medals[i]} *${names.get(normalizeJid(p.jid)) || p.username || p.jid.split("@")[0]}*
⭐ Lv ${p.level} | ${p.rank || "Academy Student"} | 🏆 ${p.wins || 0}W | 💰 ${(p.ryo || 0).toLocaleString()} Ryo`
      ).join("\n\n");

       // Keep this response text-only. Sending a remote image makes Baileys
       // download that asset before it can deliver the actual leaderboard.
       return sock.sendMessage(jid, { text:
`🏆 *NINJA LEADERBOARD*

${list}

Keep training to reach the top!`,
       }, { quoted: msg });

    } catch (err) {
      console.error("NLEADERBOARD ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Failed to load leaderboard." }, { quoted: msg });
    }
  }
};
