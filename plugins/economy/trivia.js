/**
 * KELIN MD — .trivia
 * Answer a trivia question for cash rewards.
 * Usage: .trivia  — start a question
 *        .trivia <answer>  — answer active question
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 60 * 1000; // 1 minute between new questions
const ANSWER_TIME = 30 * 1000; // 30 seconds to answer

// In-memory active questions per chat
const activeQuestions = new Map(); // jid → { question, answer, reward, timeout }

const QUESTIONS = [
  { q: "What is 15 × 15?", a: "225", reward: 500 },
  { q: "How many sides does a hexagon have?", a: "6", reward: 400 },
  { q: "What planet is known as the Red Planet?", a: "mars", reward: 600 },
  { q: "What is the capital of France?", a: "paris", reward: 500 },
  { q: "How many continents are there?", a: "7", reward: 450 },
  { q: "What gas do plants absorb from the air?", a: "carbon dioxide", reward: 700 },
  { q: "What is the square root of 144?", a: "12", reward: 500 },
  { q: "How many colors are in a rainbow?", a: "7", reward: 400 },
  { q: "What is the largest ocean?", a: "pacific", reward: 600 },
  { q: "What is the chemical symbol for gold?", a: "au", reward: 650 },
  { q: "How many bones are in the adult human body?", a: "206", reward: 750 },
  { q: "What year did World War 2 end?", a: "1945", reward: 700 },
  { q: "What is the fastest land animal?", a: "cheetah", reward: 600 },
  { q: "How many teeth does an adult human have?", a: "32", reward: 500 },
  { q: "What is 2 to the power of 10?", a: "1024", reward: 800 },
  { q: "What language has the most native speakers?", a: "mandarin", reward: 700 },
  { q: "What is H2O commonly known as?", a: "water", reward: 300 },
  { q: "How many hours are in a week?", a: "168", reward: 600 },
  { q: "What is the powerhouse of the cell?", a: "mitochondria", reward: 750 },
  { q: "What country invented pizza?", a: "italy", reward: 500 },
];

export default {
  name: "trivia",
  aliases: ["quiz", "question"],
  category: "economy",
  description: "Answer trivia questions for cash rewards!",
  usage: ".trivia  |  .trivia <your answer>",
  checkJail: true,

  async run({ sock, msg, sender, args, text }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    const existing = activeQuestions.get(jid);

    // ── Answer an active question ─────────────────────────────────────────
    if (existing && text.trim()) {
      const answer = text.trim().toLowerCase();
      if (answer === existing.answer) {
        clearTimeout(existing.timeout);
        activeQuestions.delete(jid);

        user.money += existing.reward;
        user.xp     = (user.xp || 0) + 25;
        await saveUser(sender, user);
        await addHistory(sender, "trivia", existing.reward, "Trivia correct answer");

        return reply(
`✅ *CORRECT!* 🎉

💡 Answer: *${existing.answer}*
💰 Earned: +$${existing.reward.toLocaleString()}
🏦 Balance: $${user.money.toLocaleString()}`
        );
      } else {
        return reply(`❌ Wrong answer! Try again.\n\n❓ ${existing.question}\n\n⏳ ${Math.ceil((existing.endsAt - now) / 1000)}s remaining.`);
      }
    }

    // ── Start a new question ──────────────────────────────────────────────
    if (existing) {
      return reply(`❓ A question is already active!\n\n*${existing.question}*\n\n⏳ ${Math.ceil((existing.endsAt - now) / 1000)}s remaining.`);
    }

    if (now - (user.lastTrivia || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastTrivia)) / 1000);
      return reply(`📚 You need to rest your brain! Next question in *${secs}s*.`);
    }

    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    user.lastTrivia = now;
    await saveUser(sender, user);

    const endsAt = now + ANSWER_TIME;
    const timeout = setTimeout(() => {
      if (activeQuestions.get(jid)?.question === q.q) {
        activeQuestions.delete(jid);
        sock.sendMessage(jid, {
          text: `⏰ Time's up! The answer was *${q.a}*.\n\nBetter luck next time!`,
        }).catch(() => {});
      }
    }, ANSWER_TIME);

    activeQuestions.set(jid, { question: q.q, answer: q.a, reward: q.reward, endsAt, timeout });

    return reply(
`🧠 *TRIVIA TIME!*

❓ ${q.q}

💰 Reward: $${q.reward.toLocaleString()}
⏳ You have *30 seconds* to answer!

Type *.trivia <your answer>* to respond.`
    );
  },
};
