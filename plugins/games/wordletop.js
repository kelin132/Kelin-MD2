import fs from "fs";
import path from "path";
import { getUser } from "../economy/database.js";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

const STATS_PATH = path.resolve("./database/wordleStats.json");

function loadStats() {
  if (!fs.existsSync(STATS_PATH)) fs.writeFileSync(STATS_PATH, "{}");
  try { return JSON.parse(fs.readFileSync(STATS_PATH, "utf8") || "{}"); } catch { return {}; }
}

export default {
  name: "wordletop",
  description: "View the top Wordle players leaderboard.",
  category: "games",
  usage: ".wordletop",
  aliases: ["wtop", "wordlelb"],
  cooldown: 5,

  async run({ sock, msg }) {
    const stats = loadStats();
    const leaderboard = Object.entries(stats)
      .sort((a, b) => b[1].wins - a[1].wins)
      .slice(0, 10);

    if (leaderboard.length === 0) {
      return sock.sendMessage(msg.key.remoteJid,
        { text: "📊 No Wordle games have been played yet!\n\nStart one with *.wordle*" },
        { quoted: msg });
    }

    // Look up registered names for all players in parallel
    const names = await Promise.all(
      leaderboard.map(async ([playerJid]) => {
        try {
          const user = await getUser(playerJid);
          if (user?.registered && user?.name) return user.name;
        } catch { /* fall through */ }
        return playerJid.split("@")[0];
      })
    );

    const mentions = leaderboard.map(([j]) => j);
    const text = formatAnimeLeaderboard({
      subtitle: "WORDLE LEADERBOARD",
      rows: leaderboard.map(([playerJid, data], i) => ({
        name: names[i],
        value: data.wins,
        valueText: `🏆 ${data.wins} 𝐖𝐈𝐍𝐒 · 🎮 ${data.played} 𝐏𝐋𝐀𝐘𝐄𝐃 · 📈 ${data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0}% · 🔥 ${data.bestStreak} 𝐁𝐄𝐒𝐓`,
      })),
      valueIcon: "🏆",
      valueLabel: "𝐖𝐈𝐍𝐒",
      footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
    });

    await sock.sendMessage(msg.key.remoteJid, { text, mentions }, { quoted: msg });
  }
};
