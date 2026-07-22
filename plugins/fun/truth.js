// plugins/fun/truth.js
// .tod — Start or join a Truth or Dare multiplayer game
import { truthDareGames } from "../../lib/todGame.mjs";

export default {
  name: "tod",
  description: "Start or join a Truth or Dare game",
  category: "fun",
  usage: ".tod",
  aliases: ["truthordare"],
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid  = msg.key.remoteJid;
    const chat = jid;

    const send = (text, opts = {}) =>
      sock.sendMessage(jid, { text, ...opts }, { quoted: msg });

    try {
      // Check if there's already a waiting game in this chat
      const waitingGame = Object.values(truthDareGames).find(
        (g) => g.chat === chat && g.status === "WAITING"
      );

      if (waitingGame) {
        if (waitingGame.players.includes(sender)) {
          return await send("✅ *You're already in the game!*\n\nType *start* when everyone has joined.");
        }

        if (waitingGame.players.length >= 10) {
          return await send("❌ *Game is full!* (10 players max)");
        }

        waitingGame.players.push(sender);
        waitingGame.scores[sender] = 0;

        const playerList = waitingGame.players
          .map((p, i) => `${i + 1}. @${p.split("@")[0]}`)
          .join("\n");

        return await send(
          `✅ *@${sender.split("@")[0]} joined!*\n\n👥 *Players (${waitingGame.players.length}/10):*\n${playerList}\n\n${
            waitingGame.players.length >= 2
              ? '🎮 *Type "start" to begin!*'
              : "⏳ Waiting for more players..."
          }`,
          { mentions: waitingGame.players }
        );
      }

      // No waiting game — create a new one
      const gameId  = "tod-" + Date.now();
      const newGame = {
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

      truthDareGames[gameId] = newGame;

      return await send(
        `🎪 *TRUTH OR DARE GAME STARTED!*\n\n👤 *Host:* @${sender.split("@")[0]}\n👥 *Players:* 1/10\n\n📢 Others type *tod* to join\n🚀 Type *start* when ready (2+ players)\n\n💡 *In-game commands:*\njoin • start • truth • dare • done • skip • score • leave • end`,
        { mentions: [sender] }
      );
    } catch (e) {
      console.error("TOD error:", e);
      return await send("❌ *Error starting game.* Please try again.");
    }
  },
};
