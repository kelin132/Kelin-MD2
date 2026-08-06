/** Active hangman sessions: jid → { word, guessed, wrong, maxWrong } */
const sessions = new Map();

const words = [
  "javascript","python","discord","android","keyboard",
  "blockchain","elephant","umbrella","champion","football",
  "diamond","volcano","butterfly","database","whatsapp",
  "adventure","knowledge","treasure","universe","computer",
  "hospital","musician","satellite","chocolate","jellyfish",
];

const STAGES = [
  "  ___\n |   |\n     |\n     |\n     |\n_____|",
  "  ___\n |   |\n O   |\n     |\n     |\n_____|",
  "  ___\n |   |\n O   |\n |   |\n     |\n_____|",
  "  ___\n |   |\n O   |\n/|   |\n     |\n_____|",
  "  ___\n |   |\n O   |\n/|\\  |\n     |\n_____|",
  "  ___\n |   |\n O   |\n/|\\  |\n/    |\n_____|",
  "  ___\n |   |\n O   |\n/|\\  |\n/ \\  |\n_____|",
];

function display(word, guessed) {
  return word.split("").map(c => (guessed.has(c) ? c : "_")).join(" ");
}

export default {
  name: "hangman",
  description: "Play hangman — guess the word letter by letter",
  category: "games",
  usage: ".hangman [start | guess <letter> | stop]",
  aliases: ["hang"],
  cooldown: 3,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === "stop") {
      const s = sessions.get(jid);
      sessions.delete(jid);
      return sock.sendMessage(jid, {
        text: s ? `🛑 Game stopped. Word was: *${s.word}*` : "❌ No active game."
      }, { quoted: msg });
    }

    if (sub === "guess" || sub === "g") {
      const s = sessions.get(jid);
      if (!s) return sock.sendMessage(jid, { text: "❌ No active game! Use *.hangman start*" }, { quoted: msg });

      const letter = args[1]?.toLowerCase();
      if (!letter || letter.length !== 1 || !/[a-z]/.test(letter)) {
        return sock.sendMessage(jid, { text: "❌ Guess one letter: *.hangman guess <letter>*" }, { quoted: msg });
      }
      if (s.guessed.has(letter)) {
        return sock.sendMessage(jid, { text: `⚠️ *${letter}* already guessed!` }, { quoted: msg });
      }

      s.guessed.add(letter);
      const correct = s.word.includes(letter);
      if (!correct) s.wrong.push(letter);

      const stage   = STAGES[Math.min(s.wrong.length, STAGES.length - 1)];
      const current = display(s.word, s.guessed);
      const won     = !current.includes("_");
      const lost    = s.wrong.length >= s.maxWrong;

      if (won || lost) sessions.delete(jid);

      return sock.sendMessage(jid, {
        text:
`${won ? "🎉 *YOU WIN!*" : lost ? "💀 *GAME OVER!*" : correct ? "✅ Correct!" : `❌ Wrong! (${s.maxWrong - s.wrong.length} left)`}

\`\`\`${stage}\`\`\`

📝 Word: ${won || lost ? s.word.split("").join(" ") : current}
❌ Wrong: ${s.wrong.join(", ") || "none"}
🔤 Guessed: ${[...s.guessed].join(", ") || "none"}
${won || lost ? "" : "\n▶️ *.hangman guess <letter>*"}`
      }, { quoted: msg });
    }

    // Start a new game
    if (sessions.has(jid)) {
      return sock.sendMessage(jid, {
        text: "⚠️ A hangman game is already running!\n\nGuess: *.hangman guess <letter>*\nStop: *.hangman stop*"
      }, { quoted: msg });
    }

    const word = words[Math.floor(Math.random() * words.length)];
    sessions.set(jid, { word, guessed: new Set(), wrong: [], maxWrong: 6 });

    await sock.sendMessage(jid, {
      text:
`🎯 *HANGMAN STARTED!*

\`\`\`${STAGES[0]}\`\`\`

📝 Word: ${display(word, new Set())}
📏 Length: ${word.length} letters

▶️ Guess with: *.hangman guess <letter>*
🛑 Stop with: *.hangman stop*`
    }, { quoted: msg });
  }
};
