import { readFileSync } from "fs";

const tttGames = new Map();
const wordChainGames = new Map();
const processedText = new Set();
let validWordsPromise = null;

const DIFFICULTY = {
  easy: {
    label: "🟢 EASY",
    startLength: 3,
    maxWordLength: 9,
    increment: 5,
    maxAttempts: 7,
    minTurn: 50,
    maxTurn: 70,
    description: "Start at 3 letters → max 9 | +1 every 5 words | 50–70s turns | 7 attempts",
  },
  medium: {
    label: "🟡 MEDIUM",
    startLength: 4,
    maxWordLength: 12,
    increment: 3,
    maxAttempts: 5,
    minTurn: 30,
    maxTurn: 50,
    description: "Start at 4 letters → max 12 | +1 every 3 words | 30–50s turns | 5 attempts",
  },
  hard: {
    label: "🔴 HARD",
    startLength: 5,
    maxWordLength: 15,
    increment: 2,
    maxAttempts: 3,
    minTurn: 20,
    maxTurn: 35,
    description: "Start at 5 letters → max 15 | +1 every 2 words | 20–35s turns | 3 attempts",
  },
};

const TTT_EMOJI = {
  X: "❌",
  O: "⭕",
  1: "1️⃣",
  2: "2️⃣",
  3: "3️⃣",
  4: "4️⃣",
  5: "5️⃣",
  6: "6️⃣",
  7: "7️⃣",
  8: "8️⃣",
  9: "9️⃣",
};

export async function startTicTacToe({ sock, msg, sender, mentioned = [], prefix = "." }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) {
    return send(sock, jid, "❌ This command only works in groups.", msg);
  }

  const active = tttGames.get(jid);
  if (active?.state === "PLAYING") {
    if ([active.playerX, active.playerO].includes(sender)) {
      return send(sock, jid, "⏳ You're still in the game.", msg);
    }
    return send(sock, jid, "⚠️ A TicTacToe game is already running here.", msg);
  }

  if (active?.state === "WAITING") {
    const opponent = mentioned[0] || sender;
    if (opponent === active.playerX) {
      return send(sock, jid, "❌ You cannot play against yourself.", msg);
    }
    active.playerO = opponent;
    active.state = "PLAYING";
    return sendTttStarted(sock, jid, active, msg);
  }

  const room = {
    id: `tictactoe-${Date.now()}`,
    state: "WAITING",
    playerX: sender,
    playerO: null,
    board: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    currentTurn: sender,
    symbols: { [sender]: "X" },
  };
  tttGames.set(jid, room);

  return send(sock, jid,
`*🎮 TicTacToe Game Created!*

*Player 1:* @${tag(sender)} ❌

*Waiting for Player 2...*

*How to join:*
• Type "${prefix}ttt" to join
• Type "join" to join this game
• Mention someone to invite them`, msg, [sender]);
}

export async function deleteTicTacToe({ sock, msg }) {
  const jid = msg.key.remoteJid;
  const room = tttGames.get(jid);
  if (!room) return send(sock, jid, "No TicTacToe game is running.", msg);
  tttGames.delete(jid);
  return send(sock, jid, "_Successfully deleted the running TicTacToe game._", msg);
}

export async function deleteWordChain({ sock, msg }) {
  const jid = msg.key.remoteJid;
  const game = wordChainGames.get(jid);
  if (!game) {
    return send(sock, jid, "❌ No Word Chain game is running in this chat.", msg);
  }
  game.gameEnded = true;
  game.stopTurn();
  wordChainGames.delete(jid);
  return send(sock, jid, "🎮 Word Chain game deleted successfully.", msg);
}

async function applyTttInput(sock, jid, room, sender, input, msg) {
  const normalized = String(input || "").trim().toLowerCase();
  if (!/^(?:[1-9]|(?:me)?give[ _]?up|surr?ender|off|skip)$/.test(normalized)) return false;
  const surrender = !/^[1-9]$/.test(normalized);
  if (!surrender && room.currentTurn !== sender) {
    await send(sock, jid, `⚠️ It's @${tag(room.currentTurn)}'s turn.`, msg, [room.currentTurn]);
    return true;
  }

  let winner = null;
  let tie = false;

  if (surrender) {
    winner = sender === room.playerX ? room.playerO : room.playerX;
  } else {
    const position = Number(normalized) - 1;
    if (!["X", "O"].includes(room.board[position])) {
      room.board[position] = room.symbols[sender];
      winner = getTttWinner(room);
      tie = !winner && room.board.every((cell) => cell === "X" || cell === "O");
      if (!winner && !tie) {
        room.currentTurn = sender === room.playerX ? room.playerO : room.playerX;
      }
    } else {
      await send(sock, jid, "_Invalid Position_", msg);
      return true;
    }
  }

  const board = renderTtt(room.board);
  const displayWinner = surrender ? winner : winner;
  const result = winner
    ? `🎉 @${tag(displayWinner)} Won${surrender ? " by surrender" : ""}!`
    : tie
      ? "🤝 Tie Game!"
      : `*Current Turn:* ${room.symbols[room.currentTurn] === "X" ? "❌" : "⭕"} @${tag(room.currentTurn)}`;
  const text =
`Room ID: ${room.id}

${board}

${result}
❌: @${tag(room.playerX)}
⭕: @${tag(room.playerO)}`;

  const mentions = [room.playerX, room.playerO, displayWinner || room.currentTurn];
  await send(sock, jid, text, msg, mentions);
  if (winner || tie) tttGames.delete(jid);
  return true;
}

export async function startWordChain({ sock, msg, sender, text, prefix = "." }) {
  const jid = msg.key.remoteJid;
  if (!jid?.endsWith("@g.us")) {
    return send(sock, jid, "❌ This command only works in groups.", msg);
  }

  const commandText = String(text || "").trim();
  let game = wordChainGames.get(jid);
  const lower = commandText.toLowerCase();

  if (lower.startsWith("end") && game) {
    return endWordChain(sock, jid, game, msg, "🎮 GAME ENDED\n\nSuccessfully terminated the game\n\n_See you next time!_");
  }
  if (lower.startsWith("start") && game?.waitingForPlayers) {
    if (game.players.length < 2) {
      return send(sock, jid, "❌ NOT ENOUGH PLAYERS\n\nNeed at least 2 players to start the game", msg);
    }
    return beginWordChain(sock, jid, game, msg);
  }
  if (game?.gameStatus) {
    return send(sock, jid, `⚠️ GAME ALREADY RUNNING\n\nA game is currently in progress\n\n🛑 Stop game: ${prefix}wcg end`, msg);
  }

  const difficulty = getDifficulty(commandText);
  if (!game) {
    game = await createWordChain(difficulty);
    wordChainGames.set(jid, game);
  }

  if (!game.players.includes(sender)) {
    if (game.players.length >= 5) return send(sock, jid, "🚫 ROOM FULL\n\nMaximum 5 players allowed per game", msg);
    game.players.push(sender);
  }

  const cfg = DIFFICULTY[game.difficulty];
  if (game.players.length === 1) {
    game.waitingForPlayers = true;
    scheduleWordChainLobby(sock, jid, game, msg);
    return send(sock, jid,
`🎮 WORD CHAIN GAME

${cfg.label} MODE

👤 *Player:* @${tag(game.players[0])}

📊 *Difficulty:*
${cfg.description}

⏳ *Waiting for more players...*

🎯 Type *${prefix}wcg* or *"join"* to join (max 5 players)
🚀 Type *${prefix}wcg start* to start with current players
⏱️ *Auto-start in 30 seconds* if 2+ players`, msg, game.players);
  }

  if (game.waitingForPlayers) {
    return send(sock, jid,
`🎮 PLAYERS UPDATED

${cfg.label} MODE

👥 *Current Players (${game.players.length}/5):*
${game.players.map((p, i) => `${i + 1}. @${tag(p)}`).join("\n")}

🎯 Type *"join"* to join
🚀 Type *${prefix}wcg start* to begin
⏱️ *Auto-start soon*`, msg, game.players);
  }

  return beginWordChain(sock, jid, game, msg);
}

export async function processWordChainText({ sock, msg, sender, text, prefix = "." }) {
  const jid = msg.key.remoteJid;
  const game = wordChainGames.get(jid);
  if (!game || String(text || "").trim().startsWith(prefix)) return false;

  const message = String(text || "").trim();
  const lower = message.toLowerCase();
  const key = msg.key.id || `${jid}:${sender}:${message}:${Date.now()}`;
  if (processedText.has(key)) return true;
  processedText.add(key);
  setTimeout(() => processedText.delete(key), 5_000);

  if (game.waitingForPlayers && lower === "join") {
    if (game.players.includes(sender)) return send(sock, jid, "✅ You're already in the game!", msg);
    if (game.players.length >= 5) return send(sock, jid, "🚫 ROOM FULL\n\nMaximum 5 players allowed per game", msg);
    game.players.push(sender);
    return send(sock, jid,
`🎮 PLAYER JOINED

${DIFFICULTY[game.difficulty].label} MODE

👥 *Current Players (${game.players.length}/5):*
${game.players.map((p, i) => `${i + 1}. @${tag(p)}`).join("\n")}

🎯 Type *"join"* to join
🚀 Type *${prefix}wcg start* to begin`, msg, game.players);
  }

  if (!game.gameStatus || game.currentPlayer !== sender || game.processingTurn || game.gameEnded) return false;
  game.processingTurn = true;

  if (!/^[a-z]+$/i.test(message)) {
    game.processingTurn = false;
    await send(sock, jid, `❌ Only single words are allowed.\n\n@${tag(game.currentPlayer)}'s turn continues.`, msg, [game.currentPlayer]);
    return true;
  }

  const word = lower;
  const cfg = DIFFICULTY[game.difficulty];
  const validShape = word.length >= game.wordLength && word[0] === game.previousWord.slice(-1);
  const dictionaryValid = !game.validWords || game.validWords.has(word);

  if (!validShape || !dictionaryValid) {
    game.wrongAttempts[sender] = (game.wrongAttempts[sender] || 0) + 1;
    const left = game.maxAttempts - game.wrongAttempts[sender];
    if (left <= 0) {
      return eliminateWordChainPlayer(sock, jid, game, sender, msg, "exceeded max attempts");
    }
    game.processingTurn = false;
    const reason = !dictionaryValid
      ? "Not a valid dictionary word"
      : word[0] !== game.previousWord.slice(-1)
        ? `Must start with "${game.previousWord.slice(-1)}"`
        : `Must be at least ${game.wordLength} letters`;
    await send(sock, jid,
`❎ INVALID WORD

*Reason:* ${reason}
*Attempts left:* ${left}

@${tag(game.currentPlayer)}'s turn continues
⏱️ *Time left:* ${remainingSeconds(game)}s`, msg, [game.currentPlayer]);
    return true;
  }

  game.stopTurn();
  game.wrongAttempts[sender] = 0;
  game.wordsCount++;
  if (!game.longestWord || word.length > game.longestWord.length) {
    game.longestWord = word;
    game.longestBy = sender;
  }
  game.previousWord = word;
  game.wordChain += ` → ${word}`;
  if (game.wordsCount % cfg.increment === 0 && game.wordLength < cfg.maxWordLength) game.wordLength++;
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  game.currentPlayer = game.players[game.currentPlayerIndex];
  game.processingTurn = false;
  game.turnTimeLimit = randomTurnTime(cfg);
  game.turnStartTime = Date.now();
  scheduleWordChainTurn(sock, jid, game);

  return send(sock, jid,
`✅ WORD ACCEPTED!

🎯 *Current Turn:* @${tag(game.currentPlayer)}
📝 *Start with:* "${game.previousWord.slice(-1)}"
📏 *Min length:* ${game.wordLength} letters
⏱️ *Time limit:* ${game.turnTimeLimit}s
📊 *Total words:* ${game.wordsCount}`, msg, game.players);
}

export async function handleKordGameText({ sock, msg, sender, text, prefix = "." }) {
  const body = String(text || "").trim();
  if (!body || body.startsWith(prefix) || !msg.key.remoteJid?.endsWith("@g.us")) return false;

  const ttt = tttGames.get(msg.key.remoteJid);
  if (ttt?.state === "WAITING" && body.toLowerCase() === "join" && sender !== ttt.playerX) {
    ttt.playerO = sender;
    ttt.state = "PLAYING";
    await sendTttStarted(sock, msg.key.remoteJid, ttt, msg);
    return true;
  }
  if (ttt?.state === "PLAYING" && [ttt.playerX, ttt.playerO].includes(sender)) {
    return applyTttInput(sock, msg.key.remoteJid, ttt, sender, body, msg);
  }

  return processWordChainText({ sock, msg, sender, text: body, prefix });
}

async function sendTttStarted(sock, jid, room, msg) {
  return send(sock, jid,
`🎮 TicTacToe Game Started!

${renderTtt(room.board)}

*Current turn:* @${tag(room.currentTurn)}

*How to play:* Type numbers 1-9 to place your mark
*Surrender:* Type "give up" or "surrender"`, msg,
  [room.playerX, room.playerO, room.currentTurn]);
}

function getTttWinner(room) {
  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const line = wins.find(([a, b, c]) =>
    ["X", "O"].includes(room.board[a]) &&
    room.board[a] === room.board[b] &&
    room.board[b] === room.board[c]
  );
  if (!line) return null;
  return room.board[line[0]] === "X" ? room.playerX : room.playerO;
}

function renderTtt(board) {
  return `${board.slice(0, 3).map((cell) => TTT_EMOJI[cell]).join("")}
${board.slice(3, 6).map((cell) => TTT_EMOJI[cell]).join("")}
${board.slice(6).map((cell) => TTT_EMOJI[cell]).join("")}`;
}

async function createWordChain(difficulty) {
  return {
    difficulty,
    players: [],
    currentPlayerIndex: 0,
    currentPlayer: null,
    previousWord: "",
    wordChain: "",
    wordsCount: 0,
    wordLength: DIFFICULTY[difficulty].startLength,
    maxAttempts: DIFFICULTY[difficulty].maxAttempts,
    wrongAttempts: {},
    longestWord: "",
    longestBy: "",
    gameStatus: false,
    waitingForPlayers: false,
    gameEnded: false,
    processingTurn: false,
    validWords: await loadWords(),
    waitingTimeoutId: null,
    turnIntervalId: null,
    turnTimeLimit: 0,
    turnStartTime: 0,
    finalWarningShown: false,
    stopTurn() {
      if (this.turnIntervalId) clearInterval(this.turnIntervalId);
      if (this.waitingTimeoutId) clearTimeout(this.waitingTimeoutId);
      this.turnIntervalId = null;
      this.waitingTimeoutId = null;
    },
  };
}

function scheduleWordChainLobby(sock, jid, game, msg) {
  if (game.waitingTimeoutId) clearTimeout(game.waitingTimeoutId);
  game.waitingTimeoutId = setTimeout(async () => {
    if (game.gameEnded || !wordChainGames.has(jid)) return;
    if (game.players.length >= 2) return beginWordChain(sock, jid, game, msg);
    game.gameEnded = true;
    game.stopTurn();
    wordChainGames.delete(jid);
    await send(sock, jid, "❌ Not Enough Players\n\nNeed at least 2 players to start the game", msg);
  }, 30_000);
}

async function beginWordChain(sock, jid, game, msg) {
  if (game.gameEnded) return;
  game.stopTurn();
  game.gameStatus = true;
  game.waitingForPlayers = false;
  game.previousWord = randomLetter();
  game.wordChain = game.previousWord;
  game.currentPlayerIndex = 0;
  game.currentPlayer = game.players[0];
  game.turnTimeLimit = randomTurnTime(DIFFICULTY[game.difficulty]);
  game.turnStartTime = Date.now();
  game.players.forEach((player) => { game.wrongAttempts[player] = 0; });
  const cfg = DIFFICULTY[game.difficulty];

  await send(sock, jid,
`🚀 WORD CHAIN GAME STARTED!

${cfg.label} MODE

👥 *Players (${game.players.length}):*
${game.players.map((p, i) => `${i + 1}. @${tag(p)}`).join("\n")}

🎯 *Current Turn:* @${tag(game.currentPlayer)}
📝 *Start with:* "${game.previousWord}"
📏 *Min length:* ${game.wordLength} letters
⏱️ *Time limit:* ${game.turnTimeLimit}s

📊 *Difficulty Rules:*
${cfg.description}

🔥 *General Rules:*
• Must start with last letter of previous word
• Only single words allowed
• Max ${game.maxAttempts} wrong attempts per player`, msg, game.players);
  scheduleWordChainTurn(sock, jid, game);
}

function scheduleWordChainTurn(sock, jid, game) {
  if (game.turnIntervalId) clearInterval(game.turnIntervalId);
  game.finalWarningShown = false;
  game.turnIntervalId = setInterval(async () => {
    if (game.gameEnded || !wordChainGames.has(jid)) return game.stopTurn();
    const remaining = remainingSeconds(game);
    if (remaining === 10 && !game.finalWarningShown && !game.processingTurn) {
      game.finalWarningShown = true;
      await send(sock, jid, `⚠️ FINAL WARNING!\n\n@${tag(game.currentPlayer)} — *10 seconds left!*\n\n📝 Start with: "${game.previousWord.slice(-1)}"`, null, [game.currentPlayer]);
    }
    if (remaining > 0 || game.processingTurn) return;

    game.processingTurn = true;
    const expired = game.currentPlayer;
    await send(sock, jid, `⏰ TIME'S UP!\n\n@${tag(expired)} ran out of time.`, null, [expired]);
    await eliminateWordChainPlayer(sock, jid, game, expired, null, "ran out of time");
  }, 1_000);
}

async function eliminateWordChainPlayer(sock, jid, game, player, msg, reason) {
  game.stopTurn();
  const index = game.players.indexOf(player);
  if (index !== -1) game.players.splice(index, 1);
  if (game.currentPlayerIndex >= game.players.length) game.currentPlayerIndex = 0;
  game.currentPlayer = game.players[game.currentPlayerIndex];

  if (game.players.length <= 1) {
    const winner = game.players[0];
    game.gameEnded = true;
    wordChainGames.delete(jid);
    return send(sock, jid,
`🎉 GAME OVER!

🏆 *Winner:* ${winner ? `@${tag(winner)}` : "Nobody"}

💀 @${tag(player)} ${reason}

🔗 *Final chain:* ${game.wordChain}`, msg, winner ? [player, winner] : [player]);
  }

  game.processingTurn = false;
  game.turnTimeLimit = randomTurnTime(DIFFICULTY[game.difficulty]);
  game.turnStartTime = Date.now();
  scheduleWordChainTurn(sock, jid, game);
  return send(sock, jid,
`💀 PLAYER ELIMINATED!

@${tag(player)} ${reason}

*${game.players.length} players remaining*

🎯 *Current Turn:* @${tag(game.currentPlayer)}
📝 *Start with:* "${game.previousWord.slice(-1)}"
📏 *Min length:* ${game.wordLength} letters
⏱️ *Time limit:* ${game.turnTimeLimit}s`, msg, [player, game.currentPlayer]);
}

async function endWordChain(sock, jid, game, msg, endingText) {
  game.gameEnded = true;
  game.stopTurn();
  wordChainGames.delete(jid);
  return send(sock, jid, endingText, msg);
}

async function loadWords() {
  if (!validWordsPromise) {
    validWordsPromise = import("word-list")
      .then(({ default: wordListPath }) => new Set(
        readFileSync(wordListPath, "utf8")
          .split("\n")
          .map((word) => word.trim().toLowerCase())
          .filter(Boolean)
      ))
      .catch(() => null);
  }
  return validWordsPromise;
}

function getDifficulty(text) {
  const first = String(text || "").trim().toLowerCase().split(/\s+/)[0];
  return DIFFICULTY[first] ? first : "medium";
}

function randomLetter() {
  return "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
}

function randomTurnTime(cfg) {
  return Math.floor(Math.random() * (cfg.maxTurn - cfg.minTurn + 1)) + cfg.minTurn;
}

function remainingSeconds(game) {
  return Math.max(0, game.turnTimeLimit - Math.floor((Date.now() - game.turnStartTime) / 1_000));
}

function tag(jid) {
  return String(jid || "").split("@")[0].split(":")[0];
}

function send(sock, jid, text, msg, mentions = []) {
  const options = { text };
  if (mentions.length) options.mentions = [...new Set(mentions.filter(Boolean))];
  return sock.sendMessage(jid, options, msg ? { quoted: msg } : undefined);
}
