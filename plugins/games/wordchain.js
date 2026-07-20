/**
 * Word Chain Game — adapted from Kord-Ai (Mirage / GPLv3)
 * Use .wcg play <word> to submit your word during a game.
 */

const games = new Map(); // jid → game state

const DIFF = {
  easy:   { label: "🟢 EASY",   startLen: 3, maxLen: 9,  incEvery: 5, maxAttempts: 7 },
  medium: { label: "🟡 MEDIUM", startLen: 4, maxLen: 12, incEvery: 3, maxAttempts: 5 },
  hard:   { label: "🔴 HARD",   startLen: 5, maxLen: 15, incEvery: 2, maxAttempts: 3 },
};

function newGame(diff) {
  const cfg = DIFF[diff] || DIFF.medium;
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return {
    diff, cfg,
    players:  [],
    idx:      0,
    prevWord: letters[Math.floor(Math.random() * 26)],
    chain:    "",
    count:    0,
    wordLen:  cfg.startLen,
    attempts: {},
    status:   "waiting",   // waiting | playing | ended
    longest:  null,
    waitTimer: null,
  };
}

function current(g) { return g.players[g.idx]; }
function next(g)    { g.idx = (g.idx + 1) % g.players.length; }

function lobby(g, jid) {
  const cfg  = g.cfg;
  const list = g.players.map((p, i) => `${i + 1}. @${p.split("@")[0]}`).join("\n");
  return {
    text: `\`\`\`🎮 WORD CHAIN — LOBBY\`\`\`\n\n${cfg.label}\n\n👥 *Players (${g.players.length}/5):*\n${list}\n\n• *.wcg join* to join (max 5 players)\n• *.wcg start* to begin now\n• Auto-starts in 30s when 2+ players join`,
    mentions: g.players,
  };
}

export default {
  name: "wcg",
  aliases: ["wordchain", "wordgame"],
  description: "Word Chain Game — each word must start with the last letter of the previous word",
  category: "games",
  usage: ".wcg [easy|medium|hard] · .wcg join · .wcg start · .wcg play <word> · .wcg end · .wcg status",
  cooldown: 2,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    // ── end ──────────────────────────────────────────────────────────────────
    if (sub === "end" || sub === "stop") {
      const g = games.get(jid);
      if (!g) return sock.sendMessage(jid, { text: "❌ No active Word Chain game here." }, { quoted: msg });
      clearTimeout(g.waitTimer);
      g.status = "ended";
      games.delete(jid);
      return sock.sendMessage(jid, { text: `🛑 Word Chain game ended.\n\n📊 *Final stats:*\n• Words played: ${g.count}\n• Chain: ${g.chain || "(none)"}` }, { quoted: msg });
    }

    // ── status ───────────────────────────────────────────────────────────────
    if (sub === "status" || sub === "info") {
      const g = games.get(jid);
      if (!g) return sock.sendMessage(jid, { text: "❌ No active Word Chain game here." }, { quoted: msg });
      if (g.status === "waiting") return sock.sendMessage(jid, lobby(g, jid), { quoted: msg });
      return sock.sendMessage(jid, {
        text: `📊 *WORD CHAIN STATUS*\n\n🎯 *Current turn:* @${current(g).split("@")[0]}\n📝 *Start with:* "${g.prevWord.slice(-1)}"\n📏 *Min length:* ${g.wordLen} letters\n🔢 *Words played:* ${g.count}\n👥 *Players:* ${g.players.length}`,
        mentions: [current(g)],
      }, { quoted: msg });
    }

    // ── force start ──────────────────────────────────────────────────────────
    if (sub === "start") {
      const g = games.get(jid);
      if (!g || g.status !== "waiting") return sock.sendMessage(jid, { text: "❌ No waiting game to start." }, { quoted: msg });
      if (g.players.length < 2) return sock.sendMessage(jid, { text: "❌ Need at least 2 players first. Use *.wcg join*" }, { quoted: msg });
      clearTimeout(g.waitTimer);
      return beginGame(sock, jid, g);
    }

    // ── join ─────────────────────────────────────────────────────────────────
    if (sub === "join") {
      const g = games.get(jid);
      if (!g) return sock.sendMessage(jid, { text: "❌ No waiting game to join. Start one with *.wcg*" }, { quoted: msg });
      if (g.status === "playing") return sock.sendMessage(jid, { text: "⚠️ Game already started!" }, { quoted: msg });
      if (g.players.includes(sender)) return sock.sendMessage(jid, { text: "✅ You're already in the game!" }, { quoted: msg });
      if (g.players.length >= 5) return sock.sendMessage(jid, { text: "🚫 Room full! Max 5 players." }, { quoted: msg });
      g.players.push(sender);
      g.attempts[sender] = 0;
      return sock.sendMessage(jid, lobby(g, jid));
    }

    // ── play <word> ──────────────────────────────────────────────────────────
    if (sub === "play" || sub === "p") {
      const g = games.get(jid);
      if (!g || g.status !== "playing") return sock.sendMessage(jid, { text: "❌ No active game. Start one with *.wcg*" }, { quoted: msg });
      if (current(g) !== sender) return sock.sendMessage(jid, { text: `⚠️ It's @${current(g).split("@")[0]}'s turn, not yours!`, mentions: [current(g)] }, { quoted: msg });

      const word = (args[1] || "").toLowerCase().trim();
      if (!word || !/^[a-z]+$/.test(word)) return sock.sendMessage(jid, { text: "❌ Provide a valid word (letters only).\n\nExample: *.wcg play elephant*" }, { quoted: msg });

      return handleWord(sock, jid, msg, g, sender, word);
    }

    // ── create new game / show existing lobby ─────────────────────────────────
    const existing = games.get(jid);
    if (existing?.status === "playing") {
      return sock.sendMessage(jid, {
        text: `⚠️ A Word Chain game is already running!\n\n🎯 Turn: @${current(existing).split("@")[0]}\n📝 Start with: "${existing.prevWord.slice(-1)}"\n\n• *.wcg play <word>* — submit a word\n• *.wcg status* — check game state\n• *.wcg end* — stop the game`,
        mentions: [current(existing)],
      }, { quoted: msg });
    }
    if (existing?.status === "waiting") {
      // add creator to existing lobby if not already in
      if (!existing.players.includes(sender)) {
        if (existing.players.length < 5) { existing.players.push(sender); existing.attempts[sender] = 0; }
      }
      return sock.sendMessage(jid, lobby(existing, jid));
    }

    // Create fresh game
    const diff = (["easy","medium","hard"].includes(sub)) ? sub : "medium";
    const g = newGame(diff);
    games.set(jid, g);
    g.players.push(sender);
    g.attempts[sender] = 0;

    // Auto-start timer (30s)
    g.waitTimer = setTimeout(async () => {
      const current = games.get(jid);
      if (!current || current.status !== "waiting") return;
      if (current.players.length < 2) {
        games.delete(jid);
        return sock.sendMessage(jid, { text: "❌ Not enough players joined. Game cancelled." }).catch(() => {});
      }
      await beginGame(sock, jid, current);
    }, 30_000);

    await sock.sendMessage(jid, {
      text: `\`\`\`🎮 WORD CHAIN GAME CREATED!\`\`\`\n\n${g.cfg.label}\n\n👤 *Host:* @${sender.split("@")[0]}\n\n⏳ Waiting for players...\n• *.wcg join* — join game (max 5)\n• *.wcg start* — force start now\n• Auto-starts in *30 seconds* if 2+ players\n\n📖 *How to play:*\n1. Each player says a word starting with the last letter of the previous word\n2. Use *.wcg play <word>* to submit\n3. Max ${g.cfg.maxAttempts} wrong attempts before elimination!`,
      mentions: [sender],
    }, { quoted: msg });
  },
};

async function beginGame(sock, jid, g) {
  g.status  = "playing";
  g.idx     = 0;
  g.players.forEach(p => { g.attempts[p] = 0; });
  const list = g.players.map((p, i) => `${i + 1}. @${p.split("@")[0]}`).join("\n");
  await sock.sendMessage(jid, {
    text: `\`\`\`🚀 WORD CHAIN STARTED!\`\`\`\n\n${g.cfg.label}\n\n👥 *Players (${g.players.length}):*\n${list}\n\n🎯 *First turn:* @${current(g).split("@")[0]}\n📝 *Start letter:* "${g.prevWord}"\n📏 *Min length:* ${g.wordLen} letters\n\n📖 Submit your word with:\n*.wcg play <word>*\n\n_Max ${g.cfg.maxAttempts} wrong attempts per player before elimination!_`,
    mentions: g.players,
  });
}

async function handleWord(sock, jid, msg, g, sender, word) {
  // Check starting letter
  if (word[0] !== g.prevWord.slice(-1)) {
    g.attempts[sender] = (g.attempts[sender] || 0) + 1;
    const left = g.cfg.maxAttempts - g.attempts[sender];
    if (left <= 0) return eliminate(sock, jid, g, sender, "exceeded max wrong attempts");
    return sock.sendMessage(jid, {
      text: `❌ Word must start with *"${g.prevWord.slice(-1)}"*!\n\n⚠️ Attempts left: *${left}*\n\nExample: *.wcg play ${g.prevWord.slice(-1)}___*`,
    }, { quoted: msg });
  }

  // Check minimum length
  if (word.length < g.wordLen) {
    g.attempts[sender] = (g.attempts[sender] || 0) + 1;
    const left = g.cfg.maxAttempts - g.attempts[sender];
    if (left <= 0) return eliminate(sock, jid, g, sender, "exceeded max wrong attempts");
    return sock.sendMessage(jid, {
      text: `❌ Word must be at least *${g.wordLen} letters* long! (*${word}* is ${word.length})\n\n⚠️ Attempts left: *${left}*`,
    }, { quoted: msg });
  }

  // Valid word!
  if (!g.longest || word.length > g.longest.word.length) g.longest = { word, by: sender };
  g.attempts[sender] = 0;
  g.count++;
  g.prevWord = word;
  g.chain   += (g.chain ? ` → ${word}` : word);
  if (g.count % g.cfg.incEvery === 0 && g.wordLen < g.cfg.maxLen) g.wordLen++;
  next(g);

  await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
  await sock.sendMessage(jid, {
    text: `✅ *"${word}"* accepted!\n\n🎯 *Turn:* @${current(g).split("@")[0]}\n📝 *Start with:* "${word.slice(-1)}"\n📏 *Min length:* ${g.wordLen} letters\n📊 *Words played:* ${g.count}\n\n_Submit with:_ *.wcg play <word>*`,
    mentions: [current(g)],
  });
}

async function eliminate(sock, jid, g, sender, reason) {
  const idx = g.players.indexOf(sender);
  if (idx !== -1) g.players.splice(idx, 1);
  if (g.idx >= g.players.length) g.idx = 0;

  await sock.sendMessage(jid, {
    text: `💀 @${sender.split("@")[0]} has been *eliminated!* (${reason})\n\n${g.players.length} player(s) remaining.`,
    mentions: [sender],
  });

  if (g.players.length <= 1) {
    g.status = "ended";
    const winner = g.players[0];
    games.delete(jid);
    const winnerTag = winner ? `@${winner.split("@")[0]}` : "Nobody";
    return sock.sendMessage(jid, {
      text: `\`\`\`🎉 GAME OVER!\`\`\`\n\n🏆 *Winner:* ${winnerTag}\n\n📊 *Final Stats:*\n• Words played: ${g.count}\n• Chain: ${g.chain || "(empty)"}${g.longest ? `\n• Longest word: "${g.longest.word}" by @${g.longest.by.split("@")[0]}` : ""}`,
      mentions: winner ? [winner] : [],
    });
  }

  await sock.sendMessage(jid, {
    text: `🎯 *Turn:* @${current(g).split("@")[0]}\n📝 *Start with:* "${g.prevWord.slice(-1)}"\n📏 *Min length:* ${g.wordLen} letters`,
    mentions: [current(g)],
  });
}
