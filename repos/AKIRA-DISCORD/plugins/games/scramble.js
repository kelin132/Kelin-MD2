/** Active sessions: jid → { original, scrambled, timer } */
const sessions = new Map();

const wordList = [
  "planet","galaxy","diamond","dolphin","captain","thunder","wizard",
  "jungle","crystal","penguin","volcano","kingdom","phantom","treasure",
  "dragon","warrior","harvest","miracle","lantern","chimney","october",
  "victory","chicken","monster","library","blanket","ancient","shelter",
];

function scramble(word) {
  const arr = word.split("");
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    attempts++;
  } while (arr.join("") === word && attempts < 20);
  return arr.join("");
}

export default {
  name: "scramble",
  description: "Unscramble the word — fastest player wins",
  category: "games",
  usage: ".scramble [answer <word>]",
  aliases: ["unscramble", "wordscramble"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (args[0] === "answer" || args[0] === "ans") {
      const session = sessions.get(jid);
      if (!session) return sock.sendMessage(jid, { text: "❌ No active game! Use *.scramble*" }, { quoted: msg });

      const guess = args[1]?.toLowerCase().trim();
      if (!guess) return sock.sendMessage(jid, { text: "❌ Provide your answer: *.scramble answer <word>*" }, { quoted: msg });

      if (guess === session.original) {
        clearTimeout(session.timer);
        sessions.delete(jid);
        return sock.sendMessage(jid, {
          text: `🎉 *Correct!* @${sender.split("@")[0]} unscrambled it!\n\n✅ Word: *${session.original}*`,
          mentions: [sender],
        }, { quoted: msg });
      } else {
        return sock.sendMessage(jid, { text: `❌ *${guess}* is wrong! Keep guessing...` }, { quoted: msg });
      }
    }

    if (sessions.has(jid)) {
      return sock.sendMessage(jid, {
        text: `⚠️ A scramble is already active!\n\nAnswer: *.scramble answer <word>*`
      }, { quoted: msg });
    }

    const word      = wordList[Math.floor(Math.random() * wordList.length)];
    const scrambled = scramble(word);

    const timer = setTimeout(async () => {
      sessions.delete(jid);
      try {
        await sock.sendMessage(jid, { text: `⏰ *Time's up!*\nThe word was: *${word}*` });
      } catch { /* ignore */ }
    }, 30_000);

    sessions.set(jid, { original: word, scrambled, timer });

    await sock.sendMessage(jid, {
      text:
`🔤 *WORD SCRAMBLE!*

🔀 Unscramble this: *${scrambled.toUpperCase()}*
📏 Letters: ${word.length}

⏰ You have *30 seconds!*
📝 Answer: *.scramble answer <word>*`
    }, { quoted: msg });
  }
};
