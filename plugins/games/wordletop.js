import fs from "fs";
import path from "path";

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

    const medals   = ["🥇", "🥈", "🥉"];
    const mentions = [];
    let text       = "🏆 *WORDLE LEADERBOARD*\n\n";

    leaderboard.forEach(([jid, data], i) => {
      const rank     = medals[i] || `${i + 1}.`;
      const winRate  = data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0;
      text += `${rank} @${jid.split("@")[0]}\n`;
      text += `   🏆 Wins: ${data.wins}  🎮 Played: ${data.played}  📈 ${winRate}%  🔥 Best: ${data.bestStreak}\n\n`;
      mentions.push(jid);
    });

    await sock.sendMessage(msg.key.remoteJid, { text, mentions }, { quoted: msg });
  }
};
