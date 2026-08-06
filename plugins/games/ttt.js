// plugins/games/ttt.js
// Challenge someone to Tic Tac Toe. Winner earns $200 coins.
// Moves are made with: .m <1-9>

import { games, TicTacToe } from "../../lib/tictactoe.js";

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

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command only works in groups.",
      }, { quoted: msg });
    }

    if (games.has(jid)) {
      return sock.sendMessage(jid, {
        text: "🎮 A Tic Tac Toe game is already running here.\n\nMake your move with *.m <1-9>*",
      }, { quoted: msg });
    }

    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (!mentioned.length) {
      return sock.sendMessage(jid, {
        text: "❌ Mention an opponent!\n\nUsage: *.ttt @user*",
      }, { quoted: msg });
    }

    const challenger = msg.key.participant || msg.key.remoteJid;
    const opponent   = mentioned[0];

    if (challenger === opponent) {
      return sock.sendMessage(jid, {
        text: "❌ You cannot play against yourself.",
      }, { quoted: msg });
    }

    const game = new TicTacToe(challenger, opponent, jid);
    games.set(jid, game);

    await sock.sendMessage(jid, {
      text:
`🎮 *Tic Tac Toe — $${200} Prize!*

❌ @${challenger.split("@")[0]}
⭕ @${opponent.split("@")[0]}

${game.render()}

🎯 First move: @${challenger.split("@")[0]}

Use *.m <1-9>* to place your symbol.
Winner takes *$200 coins*! 🏆`,
      mentions: [challenger, opponent],
    }, { quoted: msg });
  },
};
