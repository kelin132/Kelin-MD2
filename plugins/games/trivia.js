/** Active trivia sessions: groupJid → { question, answer, asker, timer } */
const sessions = new Map();

const questions = [
  { q: "What is the capital of France?", a: "paris" },
  { q: "How many sides does a hexagon have?", a: "6" },
  { q: "What planet is known as the Red Planet?", a: "mars" },
  { q: "Who painted the Mona Lisa?", a: "leonardo da vinci" },
  { q: "What is the largest ocean on Earth?", a: "pacific" },
  { q: "How many bones are in the adult human body?", a: "206" },
  { q: "What year did World War II end?", a: "1945" },
  { q: "What is the chemical symbol for gold?", a: "au" },
  { q: "Which country has the largest population?", a: "china" },
  { q: "What is the fastest land animal?", a: "cheetah" },
  { q: "What is the square root of 144?", a: "12" },
  { q: "In which country is the Eiffel Tower located?", a: "france" },
  { q: "What is the smallest planet in our solar system?", a: "mercury" },
  { q: "Who wrote 'Romeo and Juliet'?", a: "shakespeare" },
  { q: "What is the chemical formula for water?", a: "h2o" },
  { q: "How many continents are there on Earth?", a: "7" },
  { q: "What language is most spoken in Brazil?", a: "portuguese" },
  { q: "What is 15% of 200?", a: "30" },
  { q: "Which gas do plants absorb from the atmosphere?", a: "carbon dioxide" },
  { q: "How many players are on a standard soccer team?", a: "11" },
];

export default {
  name: "trivia",
  description: "Answer a trivia question to win points",
  category: "games",
  usage: ".trivia",
  aliases: ["quiz"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    // Answer mode
    if (args[0] === "answer" || args[0] === "ans") {
      const session = sessions.get(jid);
      if (!session) {
        return sock.sendMessage(jid, {
          text: "❌ No active trivia! Start one with *.trivia*"
        }, { quoted: msg });
      }
      const guess = args.slice(1).join(" ").toLowerCase().trim();
      if (guess === session.answer) {
        clearTimeout(session.timer);
        sessions.delete(jid);
        return sock.sendMessage(jid, {
          text: `🎉 *Correct!* @${sender.split("@")[0]} got it!\n\n✅ Answer: *${session.answer}*`,
          mentions: [sender],
        }, { quoted: msg });
      } else {
        return sock.sendMessage(jid, {
          text: `❌ Wrong! Keep trying...\n\n💡 Hint: starts with *${session.answer[0].toUpperCase()}*`
        }, { quoted: msg });
      }
    }

    if (sessions.has(jid)) {
      return sock.sendMessage(jid, {
        text: `⚠️ A trivia is already active!\n\nAnswer with *.trivia answer <your answer>*`
      }, { quoted: msg });
    }

    const pick = questions[Math.floor(Math.random() * questions.length)];
    const timer = setTimeout(async () => {
      sessions.delete(jid);
      try {
        await sock.sendMessage(jid, {
          text: `⏰ *Time's up!*\n\nThe answer was: *${pick.a}*`
        });
      } catch { /* group may have changed */ }
    }, 30_000);

    sessions.set(jid, { question: pick.q, answer: pick.a, asker: sender, timer });

    await sock.sendMessage(jid, {
      text:
`🧠 *TRIVIA TIME!*

❓ ${pick.q}

⏰ You have *30 seconds!*
📝 Answer: *.trivia answer <your answer>*`
    }, { quoted: msg });
  }
};
