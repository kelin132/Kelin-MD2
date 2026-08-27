/**
 * KELIN MD — .trivia
 * Answer a trivia question for cash rewards.
 * Usage: .trivia  — start a question
 *        .trivia <answer>  — answer active question
 */
import { getUser, saveUser, requireRegistration, addHistory } from "../economy/database.js";

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
  { q: "What is the largest land animal?", a: "elephant", reward: 500 },
  { q: "How many planets are in our solar system?", a: "8", reward: 400 },
  { q: "What is the closest star to Earth?", a: "sun", reward: 300 },
  { q: "What is the longest river in the world?", a: "nile", reward: 600 },
  { q: "What is the hardest natural substance on Earth?", a: "diamond", reward: 700 },
  { q: "What is the capital of Japan?", a: "tokyo", reward: 500 },
  { q: "What is the largest country by land area?", a: "russia", reward: 600 },
  { q: "What is the currency of the United Kingdom?", a: "pound", reward: 400 },
  { q: "What is the smallest prime number?", a: "2", reward: 500 },
  { q: "What is the capital of Italy?", a: "rome", reward: 500 },
  { q: "What is the largest organ in the human body?", a: "skin", reward: 600 },
  { q: "What is the primary gas in Earth's atmosphere?", a: "nitrogen", reward: 700 },
  { q: "What is the capital of Canada?", a: "ottawa", reward: 600 },
  { q: "What is the square root of 81?", a: "9", reward: 400 },
  { q: "What is the capital of Australia?", a: "canberra", reward: 600 },
  { q: "Which element has the atomic number 1?", a: "hydrogen", reward: 500 },
  { q: "Who painted the Mona Lisa?", a: "leonardo da vinci", reward: 700 },
  { q: "What is the largest species of shark?", a: "whale shark", reward: 600 },
  { q: "Which planet is the largest in our solar system?", a: "jupiter", reward: 400 },
  { q: "What is the chemical symbol for silver?", a: "ag", reward: 650 },
  { q: "How many strings does a standard violin have?", a: "4", reward: 500 },
  { q: "What is the capital of Germany?", a: "berlin", reward: 500 },
  { q: "Who wrote 'Romeo and Juliet'?", a: "william shakespeare", reward: 600 },
  { q: "What is the smallest continent?", a: "australia", reward: 400 },
  { q: "Which gas do humans breathe out?", a: "carbon dioxide", reward: 300 },
  { q: "What is the boiling point of water in Celsius?", a: "100", reward: 400 },
  { q: "How many legs does a spider have?", a: "8", reward: 300 },
  { q: "What is the largest desert in the world?", a: "antarctica", reward: 700 },
  { q: "Which country is also known as the Land of the Rising Sun?", a: "japan", reward: 500 },
  { q: "What is the capital of Spain?", a: "madrid", reward: 500 },
  { q: "How many years are in a millennium?", a: "1000", reward: 400 },
  { q: "What is the main ingredient in hummus?", a: "chickpeas", reward: 600 },
  { q: "Which is the tallest mountain in the world?", a: "mount everest", reward: 500 },
  { q: "What is the capital of Brazil?", a: "brasilia", reward: 600 },
  { q: "Who was the first person to step on the moon?", a: "neil armstrong", reward: 600 },
  { q: "What is the currency of the European Union?", a: "euro", reward: 300 },
  { q: "Which ocean is between the Americas and Europe/Africa?", a: "atlantic", reward: 400 },
  { q: "What is the capital of Egypt?", a: "cairo", reward: 500 },
  { q: "How many players are on a soccer team on the field?", a: "11", reward: 400 },
  { q: "What is the name of the fairy in Peter Pan?", a: "tinker bell", reward: 500 },
  { q: "Which planet is closest to the Sun?", a: "mercury", reward: 400 },
  { q: "What is the capital of Russia?", a: "moscow", reward: 500 },
  { q: "How many days are in a leap year?", a: "366", reward: 300 },
  { q: "What is the largest internal organ in the human body?", a: "liver", reward: 600 },
  { q: "Who is the author of the Harry Potter series?", a: "j.k. rowling", reward: 500 },
  { q: "What is the capital of India?", a: "new delhi", reward: 600 },
  { q: "Which bird is often associated with peace?", a: "dove", reward: 400 },
  { q: "How many hearts does an octopus have?", a: "3", reward: 700 },
  { q: "What is the capital of South Korea?", a: "seoul", reward: 500 },
  { q: "Which metal is liquid at room temperature?", a: "mercury", reward: 650 },
  { q: "What is the name of the toy cowboy in Toy Story?", a: "woody", reward: 400 },
  { q: "How many colors are in the rainbow?", a: "7", reward: 200 },
  { q: "What is the capital of China?", a: "beijing", reward: 500 },
  { q: "Which is the smallest planet in our solar system?", a: "mercury", reward: 500 },
  { q: "What is the capital of Mexico?", a: "mexico city", reward: 400 },
  { q: "How many bones are in a shark's body?", a: "0", reward: 800 },
  { q: "What is the capital of Argentina?", a: "buenos aires", reward: 600 },
  { q: "Which gas is most abundant in Earth's atmosphere?", a: "nitrogen", reward: 600 },
  { q: "What is the capital of Thailand?", a: "bangkok", reward: 500 },
  { q: "How many stripes are on the American flag?", a: "13", reward: 400 },
  { q: "What is the capital of Greece?", a: "athens", reward: 500 },
  { q: "Which fruit is known as the 'king of fruits' and has a strong smell?", a: "durian", reward: 600 },
  { q: "What is the capital of Turkey?", a: "ankara", reward: 600 },
];

export default {
  name: "trivia",
  aliases: ["quiz", "question"],
  category: "games",
  cooldown: 6,
  description: "Answer trivia questions for cash rewards!",
  usage: ".trivia  |  .trivia <your answer>",
  checkJail: true,

  async run({ sock, msg, sender, text }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now = Date.now();
    const user = await getUser(sender);
    const existing = activeQuestions.get(jid);

    if (existing && text.trim()) {
      const answer = text.trim().toLowerCase();
      if (answer === existing.answer.toLowerCase()) {
        clearTimeout(existing.timeout);
        activeQuestions.delete(jid);

        user.money += existing.reward;
        user.xp = (user.xp || 0) + 25;
        await saveUser(sender, user);
        await addHistory(sender, "trivia", existing.reward, "Trivia correct answer");

        return reply(
`✅ *CORRECT!* 🎉

💡 Answer: *${existing.answer}*
💰 Earned: +$${existing.reward.toLocaleString()}
🏦 Balance: $${user.money.toLocaleString()}`
        );
      }
      // Allow multiple attempts without repeating the question every time
      return sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }

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
