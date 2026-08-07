// plugins/games/ttt.js
// Challenge someone to Tic Tac Toe. Winner earns $200 coins.
// Once a game starts, players make moves by sending only a number from 1-9.

import { games, TicTacToe } from "../../lib/tictactoe.js";

const WIN_REWARD = 200;

export default {
  name: "ttt",
  description: "Challenge someone to Tic Tac Toe — winner earns $200",
  category: "games",
  usage: ".ttt @user",
  aliases: ["tictactoe"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command only works in groups.",
      }, { quoted: msg });
    }

    const existingGame = games.get(jid);
    if (existingGame?.isExpired()) {
      games.delete(jid);
    }

    if (args[0]?.toLowerCase() === "help") {
      return sock.sendMessage(jid, {
        text:
          "🎮 *Tic Tac Toe*\n\n" +
          "Start a game with *.ttt @user*.\n" +
          "During the game, send a number from *1-9* to move.\n" +
          "Either player can use *.ttt cancel* to end the game.",
      }, { quoted: msg });
    }

    if (args[0]?.toLowerCase() === "cancel") {
      const game = games.get(jid);
      if (!game) {
        return sock.sendMessage(jid, {
          text: "❌ There is no active Tic Tac Toe game here.",
        }, { quoted: msg });
      }
      if (!game.hasPlayer(sender)) {
        return sock.sendMessage(jid, {
          text: "❌ Only the players can cancel this game.",
        }, { quoted: msg });
      }

      games.delete(jid);
      return sock.sendMessage(jid, {
        text: "🛑 Tic Tac Toe cancelled. Start a new game with *.ttt @user*.",
      }, { quoted: msg });
    }

    if (games.has(jid)) {
      return sock.sendMessage(jid, {
        text: "🎮 A Tic Tac Toe game is already running here.\n\nMake your move by sending only a number from *1-9*.",
      }, { quoted: msg });
    }

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentioned.length) {
      return sock.sendMessage(jid, {
        text: "❌ Mention an opponent!\n\nUsage: *.ttt @user*",
      }, { quoted: msg });
    }

    const challenger = sender;
    const opponent   = mentioned[0];

    if (challenger.split(":")[0] === opponent.split(":")[0]) {
      return sock.sendMessage(jid, {
        text: "❌ You cannot play against yourself.",
      }, { quoted: msg });
    }

    const game = new TicTacToe(challenger, opponent, jid);
    games.set(jid, game);

    await sock.sendMessage(jid, {
      text:
`🎮 *Tic Tac Toe — $${WIN_REWARD} Prize!*

❌ @${challenger.split("@")[0]}
⭕ @${opponent.split("@")[0]}

${game.render()}

🎯 First move: @${challenger.split("@")[0]}

Send only a number from *1-9* to place your symbol.
Winner takes *$${WIN_REWARD} coins*!`,
      mentions: [challenger, opponent],
    }, { quoted: msg });
  },
};
