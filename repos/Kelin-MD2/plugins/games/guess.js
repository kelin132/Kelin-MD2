/**
 * KELIN MD — Wordle guess handler
 */
import fs from "fs";
import path from "path";

const DB_PATH    = path.resolve("./database/wordle.json");
const STATS_PATH = path.resolve("./database/wordleStats.json");

function loadGames() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "{}");
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8") || "{}"); } catch { return {}; }
}
function saveGames(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

function loadStats() {
  if (!fs.existsSync(STATS_PATH)) fs.writeFileSync(STATS_PATH, "{}");
  try { return JSON.parse(fs.readFileSync(STATS_PATH, "utf8") || "{}"); } catch { return {}; }
}
function saveStats(data) { fs.writeFileSync(STATS_PATH, JSON.stringify(data, null, 2)); }

function checkGuess(guess, answer) {
  const result       = Array(5).fill("⬛");
  const answerCopy   = answer.split("");

  // Pass 1: correct position (green)
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i]      = "🟩";
      answerCopy[i]  = null;
    }
  }
  // Pass 2: wrong position (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] !== "⬛") continue;
    const idx = answerCopy.indexOf(guess[i]);
    if (idx !== -1) {
      result[i]      = "🟨";
      answerCopy[idx] = null;
    }
  }
  return result.join("");
}

function recordResult(sender, won, attempts) {
  const stats = loadStats();
  if (!stats[sender]) stats[sender] = { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 };
  stats[sender].played++;
  if (won) {
    stats[sender].wins++;
    stats[sender].currentStreak++;
    if (stats[sender].currentStreak > stats[sender].bestStreak) {
      stats[sender].bestStreak = stats[sender].currentStreak;
    }
  } else {
    stats[sender].currentStreak = 0;
  }
  saveStats(stats);
}

export default {
  name: "guess",
  description: "Make a Wordle guess. Start a game with .wordle",
  category: "games",
  usage: ".guess <5-letter-word>",
  aliases: [],
  cooldown: 2,

  async run({ sock, msg, sender, args }) {
    const games = loadGames();

    if (!games[sender]) {
      return sock.sendMessage(msg.key.remoteJid,
        { text: "❌ You don't have an active Wordle game.\n\nStart one with *.wordle*" },
        { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid,
        { text: "📝 Usage: *.guess <5-letter-word>*" }, { quoted: msg });
    }

    const guess = args[0].toUpperCase().replace(/[^A-Z]/g, "");

    if (guess.length !== 5) {
      return sock.sendMessage(msg.key.remoteJid,
        { text: "❌ Your guess must be exactly *5 letters*." }, { quoted: msg });
    }

    const game   = games[sender];
    const result = checkGuess(guess, game.word);

    game.attempts++;
    game.guesses.push(guess);

    // ── WIN ───────────────────────────────────────────────────────────────────
    if (guess === game.word) {
      recordResult(sender, true, game.attempts);
      delete games[sender];
      saveGames(games);

      const boardLines = game.guesses.map(g => checkGuess(g, game.word));

      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎉 *YOU WIN!*\n\nWord: *${game.word}*\n\n${boardLines.join("\n")}\n\n✅ Solved in *${game.attempts}/6* attempts!\n🔥 Streak updated — check *.wordlestats*`
      }, { quoted: msg });
    }

    // ── GAME OVER ─────────────────────────────────────────────────────────────
    if (game.attempts >= 6) {
      const answer = game.word;
      recordResult(sender, false, 6);
      delete games[sender];
      saveGames(games);

      const boardLines = game.guesses.map(g => checkGuess(g, answer));

      return sock.sendMessage(msg.key.remoteJid, {
        text: `💀 *GAME OVER!*\n\n${boardLines.join("\n")}\n\nThe word was: *${answer}*\n\nBetter luck next time! Try again with *.wordle*`
      }, { quoted: msg });
    }

    // ── CONTINUE ──────────────────────────────────────────────────────────────
    saveGames(games);
    const boardLines = game.guesses.map(g => checkGuess(g, game.word));

    await sock.sendMessage(msg.key.remoteJid, {
      text: `${boardLines.join("\n")}\n\n*${guess}* → ${result}\n\n📊 Attempt *${game.attempts}/6*\n💡 Need help? *.wordle hint*`
    }, { quoted: msg });
  }
};
