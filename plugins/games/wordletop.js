import fs from "fs";
import path from "path";
import { getDb } from "../../lib/mongo.mjs";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";
import { getCachedLeaderboard } from "../../lib/leaderboardCache.mjs";

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
    const leaderboard = await getCachedLeaderboard(
      "wordle:leaderboard",
      async () => Object.entries(loadStats())
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10),
      { ttlMs: 15_000 },
    );

    if (leaderboard.length === 0) {
      return sock.sendMessage(msg.key.remoteJid,
        { text: "📊 No Wordle games have been played yet!\n\nStart one with *.wordle*" },
        { quoted: msg });
    }

    // One lookup replaces up to ten sequential identity reads.
    const playerJids = leaderboard.map(([playerJid]) => playerJid);
    const db = await getDb();
    const users = await db.collection("users").find(
      { _id: { $in: playerJids } },
      { projection: { _id: 1, name: 1, registered: 1 } },
    ).toArray();
    const names = new Map(
      users
        .filter((user) => user.registered && user.name)
        .map((user) => [String(user._id), user.name]),
    );

    const mentions = leaderboard.map(([j]) => j);
    const text = formatAnimeLeaderboard({
      subtitle: "WORDLE LEADERBOARD",
      rows: leaderboard.map(([playerJid, data], i) => ({
        name: names.get(playerJid) || playerJid.split("@")[0],
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
