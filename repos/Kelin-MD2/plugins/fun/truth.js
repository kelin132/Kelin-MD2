// plugins/fun/truth.js
// .tod — Start / join / play a Truth or Dare multiplayer game
//
// Game control (non-prefixed text via bot.mjs text handler):
//   join | start | truth | dare | done | skip | score | leave | end
//
// Prefixed fallbacks (always work via command router):
//   .tod           → start a game or join existing one
//   .tod join      → join the current game
//   .tod start     → start the game
//   .tod truth     → pick truth (your turn)
//   .tod dare      → pick dare (your turn)
//   .tod done      → mark challenge complete (+10 pts)
//   .tod skip      → skip challenge (-5 pts)
//   .tod score     → show scoreboard
//   .tod leave     → leave the game
//   .tod end       → end the game

import { truthDareGames, getQuestion } from "../../lib/todGame.mjs";

export default {
  name: "tod",
  description: "Start or play a Truth or Dare game",
  category: "fun",
  usage: ".tod [join|start|truth|dare|done|skip|score|leave|end]",
  aliases: ["truthordare"],
  cooldown: 3,

  async run({ sock, msg, sender, text }) {
    const jid  = msg.key.remoteJid;
    const chat = jid;

    const send = (str, opts = {}) =>
      sock.sendMessage(jid, { text: str, ...opts }, { quoted: msg });

    // ── Route subcommands ──────────────────────────────────────────────────
    const sub = (text || "").trim().toLowerCase();

    const game = Object.values(truthDareGames).find(
      (g) => g.chat === chat && g.status !== "ENDED"
    );

    // ── No subcommand → create or join ────────────────────────────────────
    if (!sub) {
      if (game) {
        if (game.players.includes(sender)) {
          return await send(
            `✅ *You're already in the game!*\n\nType *.tod start* when everyone is ready.`
          );
        }
        if (game.players.length >= 10) {
          return await send("❌ *Game full!* (10 players max)");
        }

        game.players.push(sender);
        game.scores[sender] = 0;

        const playerList = game.players
          .map((p, i) => `${i + 1}. @${p.split("@")[0]}`)
          .join("\n");

        return await send(
          `✅ *@${sender.split("@")[0]} joined!*\n\n👥 *Players (${game.players.length}/10):*\n${playerList}\n\n${
            game.players.length >= 2
              ? '🎮 *Type ".tod start" to begin!*'
              : "⏳ Waiting for more players..."
          }`,
          { mentions: game.players }
        );
      }

      // Create new game
      const gameId  = "tod-" + Date.now();
      truthDareGames[gameId] = {
        id: gameId,
        chat,
        players: [sender],
        status: "WAITING",
        currentPlayerIndex: 0,
        scores: { [sender]: 0 },
        round: 0,
        type: null,
        question: null,
        createdAt: Date.now(),
      };

      return await send(
        `🎪 *TRUTH OR DARE GAME STARTED!*\n\n👤 *Host:* @${sender.split("@")[0]}\n👥 *Players:* 1/10\n\n📢 Others type *.tod* to join\n🚀 Type *.tod start* when ready (2+ players)\n\n💡 *In-game commands (with or without dot):*\njoin • start • truth • dare • done • skip • score • leave • end`,
        { mentions: [sender] }
      );
    }

    // ── All subcommands below require an active game ──────────────────────
    if (!game) {
      return await send(
        `❌ *No active game in this chat.*\n\nUse *.tod* to start one!`
      );
    }

    // ── join ──────────────────────────────────────────────────────────────
    if (sub === "join") {
      if (game.players.includes(sender)) {
        return await send("✅ *You're already in the game!*");
      }
      if (game.players.length >= 10) {
        return await send("❌ *Game full!* (10 max)");
      }

      game.players.push(sender);
      game.scores[sender] = 0;

      const playerList = game.players
        .map((p, i) => `${i + 1}. @${p.split("@")[0]}`)
        .join("\n");

      return await send(
        `✅ *@${sender.split("@")[0]} joined!*\n\n👥 *Players (${game.players.length}/10):*\n${playerList}`,
        { mentions: game.players }
      );
    }

    // ── start ─────────────────────────────────────────────────────────────
    if (sub === "start") {
      if (game.status !== "WAITING") {
        return await send("❌ *Game is already running!*");
      }
      if (game.players.length < 2) {
        return await send(`❌ *Need 2+ players!*\n\nCurrent: ${game.players.length}`);
      }

      game.status = "PLAYING";
      game.round  = 1;

      const randomIndex = Math.floor(Math.random() * game.players.length);
      game.currentPlayerIndex = randomIndex;
      const firstPlayer = game.players[randomIndex];

      const playerList = game.players
        .map((p, i) => `${i + 1}. @${p.split("@")[0]} - 0 pts`)
        .join("\n");

      return await send(
        `🎉 *GAME STARTED!*\n\n🎯 *Round 1*\n👤 *First turn (random):* @${firstPlayer.split("@")[0]}\n\n📊 *Players:*\n${playerList}\n\n💡 Current player: type *.tod truth* or *.tod dare*`,
        { mentions: [firstPlayer] }
      );
    }

    // ── score ─────────────────────────────────────────────────────────────
    if (sub === "score") {
      const ranked = game.players
        .map((p) => ({ id: p, name: p.split("@")[0], score: game.scores[p] || 0 }))
        .sort((a, b) => b.score - a.score);

      const medals = ["🥇", "🥈", "🥉"];
      let board = "🏆 *SCORES*\n\n";
      ranked.forEach((pl, i) => {
        const medal = i < 3 ? medals[i] : `${i + 1}.`;
        board += `${medal} @${pl.name}: ${pl.score} pts`;
        if (game.status === "PLAYING" && game.players[game.currentPlayerIndex] === pl.id) {
          board += " 👈 *TURN*";
        }
        board += "\n";
      });
      board += `\n🎮 ${game.status === "WAITING" ? "Waiting to start" : `Playing — Round ${game.round}`}`;

      return await send(board, { mentions: game.players });
    }

    // ── leave ─────────────────────────────────────────────────────────────
    if (sub === "leave") {
      if (!game.players.includes(sender)) {
        return await send("❌ *You're not in this game!*");
      }

      const idx = game.players.indexOf(sender);
      game.players.splice(idx, 1);
      delete game.scores[sender];

      if (game.status === "PLAYING") {
        if (game.currentPlayerIndex >= idx) {
          game.currentPlayerIndex = Math.max(0, game.currentPlayerIndex - 1);
        }
        if (game.players.length === 0) {
          game.status = "ENDED";
          delete truthDareGames[game.id];
          return await send("🏁 *Game ended — no players left!*");
        }
        if (idx === game.currentPlayerIndex) {
          game.currentPlayerIndex = game.currentPlayerIndex % game.players.length;
        }
      }

      if (game.players.length === 0) delete truthDareGames[game.id];

      return await send(
        `👋 *@${sender.split("@")[0]} left!*\n\nRemaining: ${game.players.length}`
      );
    }

    // ── end ───────────────────────────────────────────────────────────────
    if (sub === "end") {
      game.status = "ENDED";

      const ranked = game.players
        .map((p) => ({ id: p, name: p.split("@")[0], score: game.scores[p] || 0 }))
        .sort((a, b) => b.score - a.score);

      const medals = ["🥇", "🥈", "🥉"];
      let msg2 = "🏁 *GAME OVER*\n\n";
      if (ranked.length > 0) {
        msg2 += "🏆 *FINAL STANDINGS:*\n";
        ranked.forEach((pl, i) => {
          msg2 += `${i < 3 ? medals[i] : `${i + 1}.`} @${pl.name}: ${pl.score} pts\n`;
        });
        msg2 += `\n👑 *WINNER:* @${ranked[0].name}\n🎯 Rounds: ${game.round}\n👥 Players: ${game.players.length}`;
      }

      const players = [...game.players];
      delete truthDareGames[game.id];
      return await send(msg2, { mentions: players });
    }

    // ── truth / dare / done / skip — require PLAYING + current player turn ─
    if (game.status !== "PLAYING") {
      return await send(
        `❌ *Game hasn't started yet.*\n\nType *.tod start* when 2+ players have joined.`
      );
    }

    const currentPlayer = game.players[game.currentPlayerIndex];

    if (sub === "truth" || sub === "dare") {
      if (sender !== currentPlayer) {
        return await send(
          `⏳ *It's not your turn!*\n\n👤 Current player: @${currentPlayer.split("@")[0]}`,
          { mentions: [currentPlayer] }
        );
      }

      const question  = getQuestion(sub);
      game.type     = sub;
      game.question = question;

      return await send(
        `${sub === "truth" ? "🤔" : "😈"} *${sub.toUpperCase()}*\n\n"${question}"\n\n🎯 *Player:* @${sender.split("@")[0]}\n\n💡 Type *.tod done* when finished\n💢 Type *.tod skip* to skip (-5 pts)`,
        { mentions: [sender] }
      );
    }

    if (sub === "done") {
      if (sender !== currentPlayer) {
        return await send(
          `⏳ *It's not your turn!*\n\n👤 Current player: @${currentPlayer.split("@")[0]}`,
          { mentions: [currentPlayer] }
        );
      }
      if (!game.type || !game.question) {
        return await send(`❌ *Choose *.tod truth* or *.tod dare* first!*`);
      }

      game.scores[sender] = (game.scores[sender] || 0) + 10;
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      if (game.currentPlayerIndex === 0) game.round++;

      const nextPlayer = game.players[game.currentPlayerIndex];
      game.type     = null;
      game.question = null;

      return await send(
        `✅ *Completed!*\n\n🏆 @${sender.split("@")[0]} +10 pts (Total: ${game.scores[sender]})\n\n🎯 *Round ${game.round}*\n👤 *Next:* @${nextPlayer.split("@")[0]}\n\n💡 Type *.tod truth* or *.tod dare*!`,
        { mentions: [sender, nextPlayer] }
      );
    }

    if (sub === "skip") {
      if (sender !== currentPlayer) {
        return await send(
          `⏳ *It's not your turn!*\n\n👤 Current player: @${currentPlayer.split("@")[0]}`,
          { mentions: [currentPlayer] }
        );
      }
      if (!game.type || !game.question) {
        return await send(`❌ *Choose *.tod truth* or *.tod dare* first!*`);
      }

      game.scores[sender] = Math.max(0, (game.scores[sender] || 0) - 5);
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      if (game.currentPlayerIndex === 0) game.round++;

      const nextPlayer = game.players[game.currentPlayerIndex];
      game.type     = null;
      game.question = null;

      return await send(
        `⏭️ *Skipped!*\n\n❌ @${sender.split("@")[0]} -5 pts (Total: ${game.scores[sender]})\n\n🎯 *Round ${game.round}*\n👤 *Next:* @${nextPlayer.split("@")[0]}\n\n💡 Type *.tod truth* or *.tod dare*!`,
        { mentions: [sender, nextPlayer] }
      );
    }

    // Unknown subcommand
    return await send(
      `❓ Unknown command.\n\n💡 Available: *.tod join / start / truth / dare / done / skip / score / leave / end*`
    );
  },
};
