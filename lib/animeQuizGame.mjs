/**
 * KELIN MD — Anime Quiz Game Engine
 * Manages per-group quiz sessions for the .aquiz command.
 *
 * Flow:
 *  1. .aquiz starts a session in the group
 *  2. A question is fetched and sent
 *  3. First user to send the correct answer (plain text, no prefix) wins 1 point
 *  4. After a correct answer: 5-second wait → next question
 *  5. First player to reach 10 points wins the prize (10,000–100,000 coins)
 */

const DAVID_BASE   = "https://apis.davidcyril.name.ng";
const WIN_POINTS   = 10;
const NEXT_DELAY   = 5_000;   // ms before next question
const TIMEOUT_MS   = 45_000;  // ms per question before auto-skip

// jid → session
export const quizSessions = new Map();

// ── API helper ────────────────────────────────────────────────────────────────

async function fetchQuestion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res  = await fetch(`${DAVID_BASE}/api/games/anime-quiz`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error("Bad API response");
    return json.data; // { question, options, answer }
  } finally {
    clearTimeout(timer);
  }
}

// ── Session helpers ───────────────────────────────────────────────────────────

function clearSession(jid) {
  const session = quizSessions.get(jid);
  if (!session) return;
  clearTimeout(session.questionTimer);
  clearTimeout(session.nextTimer);
  quizSessions.delete(jid);
}

function formatScoreboard(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "  _No scores yet_";
  return sorted
    .map(([jid, pts], i) => `  ${i + 1}. @${jid.split("@")[0]} — *${pts} pt${pts !== 1 ? "s" : ""}*`)
    .join("\n");
}

// ── Public: start a new session ───────────────────────────────────────────────

export async function startQuizSession(sock, jid, starterJid) {
  if (quizSessions.has(jid)) {
    await sock.sendMessage(jid, {
      text: "🎌 An anime quiz is *already running* in this group!\nType the correct answer to win a point.",
    });
    return;
  }

  const session = {
    active:        true,
    scores:        {},              // { senderJid: points }
    question:      null,
    answer:        null,
    options:       [],
    questionTimer: null,
    nextTimer:     null,
    createdAt:     Date.now(),
    starter:       starterJid,
  };

  quizSessions.set(jid, session);

  await sock.sendMessage(jid, {
    text:
      `🎌 *ANIME QUIZ STARTED!* 🎌\n\n` +
      `📖 How to play:\n` +
      `• A question will appear — type the correct answer!\n` +
      `• First to answer correctly wins *1 point*\n` +
      `• First to reach *${WIN_POINTS} points* wins a cash prize 💰\n` +
      `• No prefix needed — just type the answer!\n\n` +
      `💡 Type *.aquiz stop* to end the game early.\n\n` +
      `First question coming up…`,
  });

  await sendNextQuestion(sock, jid);
}

// ── Internal: post a question ─────────────────────────────────────────────────

async function sendNextQuestion(sock, jid) {
  const session = quizSessions.get(jid);
  if (!session) return;

  let q;
  try {
    q = await fetchQuestion();
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to fetch a question: ${err.message}\nGame ended.`,
    });
    clearSession(jid);
    return;
  }

  session.question = q.question;
  session.answer   = q.answer.trim().toLowerCase();
  session.options  = q.options ?? [];

  const optText = session.options.length
    ? "\n\n📝 *Options:*\n" + session.options.map((o, i) => `  ${["A","B","C","D"][i] ?? i + 1}. ${o}`).join("\n")
    : "";

  await sock.sendMessage(jid, {
    text:
      `❓ *ANIME QUIZ*\n\n` +
      `${q.question}` +
      optText +
      `\n\n⏳ You have *45 seconds* to answer!`,
  });

  // Auto-skip if nobody answers in time
  session.questionTimer = setTimeout(async () => {
    const s = quizSessions.get(jid);
    if (!s || s.answer !== q.answer.trim().toLowerCase()) return; // already answered
    await sock.sendMessage(jid, {
      text: `⏰ *Time's up!*\n\nThe correct answer was: *${q.answer}*\n\n⏳ Next question in 5 seconds…`,
    });
    scheduleNextQuestion(sock, jid);
  }, TIMEOUT_MS);
}

// ── Internal: schedule the next question after a delay ───────────────────────

function scheduleNextQuestion(sock, jid) {
  const session = quizSessions.get(jid);
  if (!session) return;

  // Clear any stale question timer
  clearTimeout(session.questionTimer);
  session.question = null;
  session.answer   = null;
  session.options  = [];

  session.nextTimer = setTimeout(() => sendNextQuestion(sock, jid), NEXT_DELAY);
}

// ── Public: stop the session ──────────────────────────────────────────────────

export async function stopQuizSession(sock, jid) {
  const session = quizSessions.get(jid);
  if (!session) {
    await sock.sendMessage(jid, { text: "ℹ️ No anime quiz is currently running in this group." });
    return;
  }

  const scoreboard = formatScoreboard(session.scores);
  const mentions   = Object.keys(session.scores);

  clearSession(jid);

  await sock.sendMessage(jid, {
    text:
      `🛑 *Anime Quiz Ended!*\n\n` +
      `📊 *Final Scoreboard:*\n${scoreboard}\n\n` +
      `_Game stopped manually._`,
    mentions,
  });
}

// ── Public: handle a plain-text message (called from bot.mjs) ────────────────

export async function handleAnimeQuizText(sock, msg, getUser, saveUser) {
  const jid     = msg.key.remoteJid;
  const session = quizSessions.get(jid);

  if (!session || !session.active || !session.answer) return;

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";

  if (!body.trim()) return;

  // Only check if it's not a command (doesn't start with . or !)
  const text = body.trim();
  if (text.startsWith(".") || text.startsWith("!") || text.startsWith("/")) return;

  const sender = msg.key.participant || msg.key.remoteJid || "";

  if (text.toLowerCase() === session.answer) {
    // Correct!
    clearTimeout(session.questionTimer);

    session.scores[sender] = (session.scores[sender] || 0) + 1;
    const pts = session.scores[sender];

    // Null out the answer so duplicate replies don't trigger again
    session.answer   = null;
    session.question = null;

    const mentions = [sender];

    // ── Check for winner ──────────────────────────────────────────────────
    if (pts >= WIN_POINTS) {
      const prize = Math.floor(Math.random() * 90_001) + 10_000; // 10k–100k
      const scoreboard = formatScoreboard(session.scores);
      clearSession(jid);

      // Award prize
      try {
        const user    = await getUser(sender);
        user.money    = (user.money || 0) + prize;
        user.xp       = (user.xp    || 0) + 500;
        await saveUser(sender, user);
      } catch { /* DB may not be available */ }

      await sock.sendMessage(jid, {
        text:
          `✅ *CORRECT!* 🎉\n\n` +
          `@${sender.split("@")[0]} answered correctly!\n\n` +
          `🏆 *@${sender.split("@")[0]} WINS THE QUIZ!* 🏆\n\n` +
          `💰 *Prize:* $${prize.toLocaleString()} added to your wallet!\n\n` +
          `📊 *Final Scoreboard:*\n${scoreboard}\n\n` +
          `_Thanks for playing! Start a new game with .aquiz_`,
        mentions,
      });
      return;
    }

    // ── Not yet won — announce point and schedule next question ───────────
    await sock.sendMessage(jid, {
      text:
        `✅ *CORRECT!* 🎌\n\n` +
        `@${sender.split("@")[0]} got it right!\n` +
        `The answer was: *${text}*\n\n` +
        `🏅 Score: *${pts}/${WIN_POINTS} pts*\n\n` +
        `⏳ *Wait for next question…*`,
      mentions,
    });

    scheduleNextQuestion(sock, jid);
  }
}

// ── Stale session cleanup (auto-expire after 2 hours) ────────────────────────

setInterval(() => {
  const now     = Date.now();
  const twoHrs  = 2 * 60 * 60 * 1000;
  for (const [jid, session] of quizSessions) {
    if (now - session.createdAt > twoHrs) {
      clearTimeout(session.questionTimer);
      clearTimeout(session.nextTimer);
      quizSessions.delete(jid);
    }
  }
}, 30 * 60 * 1000);

console.log("🎌 Anime Quiz engine loaded");
