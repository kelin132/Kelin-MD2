/**
 * KELIN MD — Wordle game (start / stop / hint)
 */
import fs from "fs";
import path from "path";
import { words } from "../../lib/words.js";

const DB_PATH    = path.resolve("./database/wordle.json");
const STATS_PATH = path.resolve("./database/wordleStats.json");

function loadGames() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "{}");
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}"); } catch { return {}; }
}

function saveGames(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function loadStats() {
  if (!fs.existsSync(STATS_PATH)) fs.writeFileSync(STATS_PATH, "{}");
  try { return JSON.parse(fs.readFileSync(STATS_PATH, "utf8") || "{}"); } catch { return {}; }
}

function saveStats(data) {
  fs.writeFileSync(STATS_PATH, JSON.stringify(data, null, 2));
}

export default {
  name: "wordle",
  description: "Guess the 5-letter word in 6 tries! Use .wordle stop | hint",
  category: "games",
  usage: ".wordle [stop|hint]",
  aliases: ["wd"],
  cooldown: 5,

  async run({ sock, msg, sender, prefix, args }) {
    const games  = loadGames();
    const action = args[0]?.toLowerCase();

    // ── STOP ──────────────────────────────────────────────────────────────────
    if (action === "stop") {
      if (!games[sender]) {
        return sock.sendMessage(msg.key.remoteJid,
          { text: "❌ You don't have an active Wordle game." }, { quoted: msg });
      }
      const word = games[sender].word;
      delete games[sender];
      saveGames(games);
      return sock.sendMessage(msg.key.remoteJid,
        { text: `🛑 Wordle cancelled.\n\nThe word was: *${word}*` }, { quoted: msg });
    }

    // ── HINT ──────────────────────────────────────────────────────────────────
    if (action === "hint") {
      if (!games[sender]) {
        return sock.sendMessage(msg.key.remoteJid,
          { text: "❌ You don't have an active Wordle game.\n\nStart one with *.wordle*" }, { quoted: msg });
      }
      const word  = games[sender].word;
      const index = Math.floor(Math.random() * word.length);
      const hint  = word.split("").map((l, i) => (i === index ? l : "⬜")).join(" ");

      // Track hint used
      games[sender].hints = (games[sender].hints || 0) + 1;
      saveGames(games);

      return sock.sendMessage(msg.key.remoteJid, {
        text: `💡 *Wordle Hint* (hint #${games[sender].hints})\n\n${hint}\n\nOne letter revealed!`
      }, { quoted: msg });
    }

    // ── START NEW GAME ────────────────────────────────────────────────────────
    if (games[sender]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎮 You already have an active Wordle game!\n\n• Use *${prefix}guess <word>* to guess\n• Use *${prefix}wordle hint* for a hint\n• Use *${prefix}wordle stop* to cancel`
      }, { quoted: msg });
    }

    const word = words[Math.floor(Math.random() * words.length)];
    games[sender] = { word, attempts: 0, guesses: [], hints: 0 };
    saveGames(games);

    // Init stats if needed
    const stats = loadStats();
    if (!stats[sender]) {
      stats[sender] = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
      saveStats(stats);
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🟩 *WORDLE STARTED!*\n\n📝 Guess the *5-letter word* in 6 attempts.\n\n🟩 = correct position\n🟨 = wrong position\n⬛ = not in word\n\n👉 Reply with: *${prefix}guess <word>*\n💡 Need help? *${prefix}wordle hint*\n🛑 Give up? *${prefix}wordle stop*`
    }, { quoted: msg });
  }
};
