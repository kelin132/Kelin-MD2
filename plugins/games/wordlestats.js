import fs from "fs";
import path from "path";

const STATS_PATH = path.resolve("./database/wordleStats.json");

function loadStats() {
  if (!fs.existsSync(STATS_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(STATS_PATH, "utf8") || "{}"); } catch { return {}; }
}

export default {
  name: "wordlestats",
  aliases: ["wstats"],
  description: "View your Wordle statistics.",
  category: "games",
  usage: ".wordlestats",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const stats = loadStats();
    const s = stats[sender];

    if (!s || s.played === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "📊 You haven't played any Wordle games yet!\n\nStart one with *.wordle*"
      }, { quoted: msg });
    }

    const winRate = Math.round((s.wins / s.played) * 100);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `📊 *YOUR WORDLE STATS*\n\n🎮 Games Played : ${s.played}\n🏆 Wins         : ${s.wins}\n💀 Losses       : ${s.played - s.wins}\n📈 Win Rate     : ${winRate}%\n🔥 Current Streak: ${s.currentStreak}\n⭐ Best Streak  : ${s.bestStreak}\n\n🎯 Keep playing to improve your stats!`
    }, { quoted: msg });
  }
};
