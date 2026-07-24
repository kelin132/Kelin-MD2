/**
 * KELIN MD — Anime Quiz Game Engine
 *
 * Flow:
 *  1. .aquiz → opens a lobby; players type "join" to register (registered economy users only)
 *  2. Game auto-starts after 1 minute (or .aquiz start if owner wants early start)
 *  3. A question is posted; only joined players may answer
 *  4. First joined player to type the correct answer wins 1 point
 *  5. Wrong answer → that player is LOCKED for the current question only
 *  6. After correct answer: 5-second wait → "Wait for next question" → next question
 *  7. First to 10 points wins $10,000–$100,000
 */

const DAVID_BASE   = "https://apis.davidcyril.name.ng";
const WIN_POINTS   = 10;
const LOBBY_WAIT   = 60_000;  // 1 minute join window
const NEXT_DELAY   = 5_000;   // ms between questions
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearSession(jid) {
  const s = quizSessions.get(jid);
  if (!s) return;
  clearTimeout(s.lobbyTimer);
  clearTimeout(s.questionTimer);
  clearTimeout(s.nextTimer);
  quizSessions.delete(jid);
}

function formatScoreboard(scores, players) {
  // Include all players even if score is 0
  const allPlayers = [...new Set([...Object.keys(scores), ...(players ? [...players] : [])])];
  const sorted     = allPlayers
    .map(jid => [jid, scores[jid] ?? 0])
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return "  _No players yet_";
  return sorted
    .map(([jid, pts], i) =>
      `  ${i + 1}. @${jid.split("@")[0]} — *${pts} pt${pts !== 1 ? "s" : ""}*`
    )
    .join("\n");
}

// ── Public: open a lobby ──────────────────────────────────────────────────────

export async function openQuizLobby(sock, jid, starterJid, getUser) {
  if (quizSessions.has(jid)) {
    const s = quizSessions.get(jid);
    if (s.state === "lobby") {
      await sock.sendMessage(jid, {
        text: "🎌 A quiz lobby is already open! Type *join* to enter.",
      });
    } else {
      await sock.sendMessage(jid, {
        text: "🎌 An anime quiz is already running! Use *.aquiz score* to see scores.",
      });
    }
    return;
  }

  // Verify starter is a registered economy user
  try {
    const user = await getUser(starterJid);
    if (!user.registered) {
      await sock.sendMessage(jid, {
        text: "❌ You must be registered to start a quiz!\nUse *.register* to create an economy account first.",
      });
      return;
    }
  } catch { /* DB may not be available — allow anyway */ }

  const session = {
    state:         "lobby",
    players:       new Set(),          // JIDs of joined players
    scores:        {},                 // { jid: points }
    lockedFor:     new Set(),          // JIDs locked for the current question
    question:      null,
    answer:        null,
    options:       [],
    lobbyTimer:    null,
    questionTimer: null,
    nextTimer:     null,
    createdAt:     Date.now(),
    starter:       starterJid,
  };

  quizSessions.set(jid, session);

  // Auto-add the starter
  session.players.add(starterJid);

  await sock.sendMessage(jid, {
    text:
      `🎌 *ANIME QUIZ LOBBY OPENED!* 🎌\n\n` +
      `📖 *How to join:*\n` +
      `• Type *join* to enter the game\n` +
      `• Only registered economy users can join\n\n` +
      `📋 *Rules:*\n` +
      `• A question appears — type the answer (no prefix!)\n` +
      `• First correct answer wins *1 point*\n` +
      `• ❌ Wrong answer = *locked out* for that question\n` +
      `• First to *${WIN_POINTS} points* wins *$10,000–$100,000*! 💰\n\n` +
      `⏳ Game starts automatically in *1 minute*.\n` +
      `Use *.aquiz start* to begin early.\n\n` +
      `👤 @${starterJid.split("@")[0]} has joined! (1 player)`,
    mentions: [starterJid],
  });

  // Auto-start after 1 minute
  session.lobbyTimer = setTimeout(async () => {
    const s = quizSessions.get(jid);
    if (!s || s.state !== "lobby") return;
    await launchGame(sock, jid);
  }, LOBBY_WAIT);
}

// ── Public: force-start from lobby ───────────────────────────────────────────

export async function forceStartQuiz(sock, jid, requesterJid) {
  const s = quizSessions.get(jid);
  if (!s) {
    await sock.sendMessage(jid, { text: "❌ No quiz lobby is open. Use *.aquiz* to start one." });
    return;
  }
  if (s.state !== "lobby") {
    await sock.sendMessage(jid, { text: "ℹ️ The quiz is already running!" });
    return;
  }
  // Only starter or owner can force-start
  if (requesterJid !== s.starter) {
    await sock.sendMessage(jid, { text: "❌ Only the player who opened the lobby can force-start." });
    return;
  }
  clearTimeout(s.lobbyTimer);
  await launchGame(sock, jid);
}

// ── Internal: transition lobby → active ──────────────────────────────────────

async function launchGame(sock, jid) {
  const s = quizSessions.get(jid);
  if (!s) return;

  if (s.players.size === 0) {
    await sock.sendMessage(jid, {
      text: "😔 No players joined the lobby. Game cancelled.",
    });
    clearSession(jid);
    return;
  }

  s.state = "active";
  const mentions = [...s.players];

  await sock.sendMessage(jid, {
    text:
      `🎌 *ANIME QUIZ STARTING!* 🎌\n\n` +
      `👥 *Players (${mentions.length}):*\n` +
      mentions.map(jid => `  • @${jid.split("@")[0]}`).join("\n") +
      `\n\n🏆 First to *${WIN_POINTS} points* wins!\n💰 Prize: $10,000–$100,000\n\nFirst question incoming…`,
    mentions,
  });

  await sendNextQuestion(sock, jid);
}

// ── Internal: post a question ─────────────────────────────────────────────────

async function sendNextQuestion(sock, jid) {
  const s = quizSessions.get(jid);
  if (!s || s.state !== "active") return;

  // Clear locks from previous question
  s.lockedFor.clear();

  let q;
  try {
    q = await fetchQuestion();
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `❌ Failed to fetch question: ${err.message}\nGame ended.`,
    });
    clearSession(jid);
    return;
  }

  s.question = q.question;
  s.answer   = q.answer.trim().toLowerCase();
  s.options  = q.options ?? [];

  const optText = s.options.length
    ? "\n\n📝 *Options:*\n" +
      s.options.map((o, i) => `  ${["A", "B", "C", "D"][i] ?? i + 1}. ${o}`).join("\n")
    : "";

  const playerList = [...s.players].map(j => `@${j.split("@")[0]}`).join(", ");

  await sock.sendMessage(jid, {
    text:
      `❓ *ANIME QUIZ*\n\n` +
      `${q.question}` +
      optText +
      `\n\n👥 Playing: ${playerList}\n` +
      `⏳ *45 seconds* — type your answer!`,
    mentions: [...s.players],
  });

  // Auto-skip if nobody answers in time
  s.questionTimer = setTimeout(async () => {
    const sess = quizSessions.get(jid);
    if (!sess || !sess.answer) return; // already answered
    const correctAns = sess.answer;
    sess.answer = null;
    await sock.sendMessage(jid, {
      text:
        `⏰ *Time's up!* Nobody got it.\n\n` +
        `✅ The answer was: *${correctAns}*\n\n` +
        `⏳ *Wait for next question…*`,
    });
    scheduleNextQuestion(sock, jid);
  }, TIMEOUT_MS);
}

// ── Internal: schedule next question ─────────────────────────────────────────

function scheduleNextQuestion(sock, jid) {
  const s = quizSessions.get(jid);
  if (!s) return;
  clearTimeout(s.questionTimer);
  s.answer   = null;
  s.question = null;
  s.options  = [];
  s.nextTimer = setTimeout(() => sendNextQuestion(sock, jid), NEXT_DELAY);
}

// ── Public: stop the session ──────────────────────────────────────────────────

export async function stopQuizSession(sock, jid) {
  const s = quizSessions.get(jid);
  if (!s) {
    await sock.sendMessage(jid, { text: "ℹ️ No anime quiz is currently running here." });
    return;
  }
  const board    = formatScoreboard(s.scores, s.players);
  const mentions = [...s.players];
  clearSession(jid);
  await sock.sendMessage(jid, {
    text:
      `🛑 *Anime Quiz Ended!*\n\n📊 *Final Scoreboard:*\n${board}\n\n_Game was stopped manually._`,
    mentions,
  });
}

// ── Public: handle all plain-text messages (called from bot.mjs) ─────────────

export async function handleAnimeQuizText(sock, msg, getUser, saveUser) {
  const jid = msg.key.remoteJid;
  const s   = quizSessions.get(jid);
  if (!s) return;

  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";

  const text   = body.trim();
  const sender = msg.key.participant || msg.key.remoteJid || "";

  if (!text || !sender) return;

  // Ignore commands
  if (text.startsWith(".") || text.startsWith("!") || text.startsWith("/")) return;

  // ── LOBBY: handle "join" ──────────────────────────────────────────────────
  if (s.state === "lobby") {
    if (text.toLowerCase() !== "join") return;

    if (s.players.has(sender)) {
      await sock.sendMessage(jid, {
        text: `ℹ️ @${sender.split("@")[0]}, you've already joined!`,
        mentions: [sender],
      });
      return;
    }

    // Check registration
    try {
      const user = await getUser(sender);
      if (!user.registered) {
        await sock.sendMessage(jid, {
          text:
            `❌ @${sender.split("@")[0]}, you must be *registered* to join!\n` +
            `Use *.register* to create an economy account.`,
          mentions: [sender],
        });
        return;
      }
    } catch { /* allow if DB unavailable */ }

    s.players.add(sender);
    await sock.sendMessage(jid, {
      text:
        `✅ @${sender.split("@")[0]} joined the quiz!\n` +
        `👥 Players: *${s.players.size}*\n\n` +
        `⏳ Game starts in less than 1 minute.`,
      mentions: [sender],
    });
    return;
  }

  // ── ACTIVE: handle answers ────────────────────────────────────────────────
  if (s.state !== "active") return;
  if (!s.answer) return; // between questions

  // Only joined players can answer
  if (!s.players.has(sender)) return;

  // Locked out for this question?
  if (s.lockedFor.has(sender)) return;

  const given = text.toLowerCase();

  if (given === s.answer) {
    // ── Correct answer ──────────────────────────────────────────────────────
    clearTimeout(s.questionTimer);

    s.scores[sender] = (s.scores[sender] || 0) + 1;
    const pts = s.scores[sender];
    s.answer  = null; // prevent duplicate triggers

    const mentions = [sender];

    if (pts >= WIN_POINTS) {
      // ── WINNER ────────────────────────────────────────────────────────────
      const prize      = Math.floor(Math.random() * 90_001) + 10_000;
      const scoreboard = formatScoreboard(s.scores, s.players);
      const allMentions = [...s.players];
      clearSession(jid);

      try {
        const user = await getUser(sender);
        user.money = (user.money || 0) + prize;
        user.xp    = (user.xp    || 0) + 500;
        await saveUser(sender, user);
      } catch { /* DB may not be available */ }

      await sock.sendMessage(jid, {
        text:
          `✅ *CORRECT!* 🎉\n\n` +
          `🏆 *@${sender.split("@")[0]} WINS THE QUIZ!* 🏆\n\n` +
          `💰 *Prize:* $${prize.toLocaleString()} added to your wallet!\n\n` +
          `📊 *Final Scoreboard:*\n${scoreboard}\n\n` +
          `_Thanks for playing! Start a new game with .aquiz_`,
        mentions: allMentions,
      });
      return;
    }

    // ── Point awarded, not yet won ────────────────────────────────────────
    await sock.sendMessage(jid, {
      text:
        `✅ *CORRECT!* 🎌\n\n` +
        `@${sender.split("@")[0]} got it right!\n` +
        `Answer: *${given}*\n\n` +
        `🏅 Score: *${pts}/${WIN_POINTS} pts*\n\n` +
        `⏳ *Wait for next question…*`,
      mentions,
    });
    scheduleNextQuestion(sock, jid);

  } else {
    // ── Wrong answer — lock this player for the current question ──────────
    s.lockedFor.add(sender);
    await sock.sendMessage(jid, {
      text:
        `❌ Wrong answer, @${sender.split("@")[0]}!\n` +
        `🔒 You are *locked out* for this question.\n` +
        `Wait for the next question to try again!`,
      mentions: [sender],
    });
  }
}

// ── Stale session cleanup (auto-expire after 2 hours) ────────────────────────

setInterval(() => {
  const now    = Date.now();
  const twoHrs = 2 * 60 * 60 * 1000;
  for (const [jid, s] of quizSessions) {
    if (now - s.createdAt > twoHrs) {
      clearTimeout(s.lobbyTimer);
      clearTimeout(s.questionTimer);
      clearTimeout(s.nextTimer);
      quizSessions.delete(jid);
    }
  }
}, 30 * 60 * 1000);

console.log("🎌 Anime Quiz engine loaded");
