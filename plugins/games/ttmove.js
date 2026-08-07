// plugins/games/ttmove.js
// Process moves in an active Tic Tac Toe game.
// Usage: send only a number from 1-9 while a game is active.
//
// Rewards the winner with coins. No penalty for the loser.

import { games } from "../../lib/tictactoe.js";
import { addMoney, isRegistered } from "../economy/database.js";

const WIN_REWARD = 200; // coins awarded to the winner

export default {
  name: "m",
  description: "Make a move in the active Tic Tac Toe game (1–9)",
  category: "games",
  usage: "1-9 during an active .ttt game",
  aliases: ["move"],
  cooldown: 1,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ Tic Tac Toe only works in groups.",
      }, { quoted: msg });
    }

    const game = games.get(jid);

    if (!game) {
      return sock.sendMessage(jid, {
        text: "❌ No active Tic Tac Toe game here.\n\nStart one with *.ttt @user*",
      }, { quoted: msg });
    }

    if (game.isExpired()) {
      games.delete(jid);
      return sock.sendMessage(jid, {
        text: "⌛ This game expired after 30 minutes of inactivity.\n\nStart a new one with *.ttt @user*",
      }, { quoted: msg });
    }

    if (!game.hasPlayer(sender)) {
      return sock.sendMessage(jid, {
        text: "❌ You are not a player in this game!",
      }, { quoted: msg });
    }

    const pos = args[0];
    if (!/^[1-9]$/.test(pos || "")) {
      return sock.sendMessage(jid, {
        text: `❌ Pick a number from *1–9* by sending it directly.\n\n${game.render()}`,
        mentions: [game.turn],
      }, { quoted: msg });
    }

    const result = game.move(sender, pos);

    if (!result.success) {
      if (result.expired) {
        games.delete(jid);
      }
      return sock.sendMessage(jid, {
        text: `❌ ${result.message}`,
      }, { quoted: msg });
    }

    const board = game.render();

    // ── Draw ─────────────────────────────────────────────────────────────────
    if (result.draw) {
      games.delete(jid);
      return sock.sendMessage(jid, {
        text:
`${board}
🤝 *It's a draw!*

@${game.playerX.split("@")[0]} vs @${game.playerO.split("@")[0]}

No coins this time. Rematch with *.ttt @user*`,
        mentions: [game.playerX, game.playerO],
      }, { quoted: msg });
    }

    // ── Winner ───────────────────────────────────────────────────────────────
    if (result.winner) {
      const winnerJid = game.winner;
      const loserJid  = winnerJid === game.playerX ? game.playerO : game.playerX;

      games.delete(jid);

      // Award coins — only if the winner is registered in the economy
      let rewardLine = "";
      try {
        if (await isRegistered(winnerJid)) {
          await addMoney(winnerJid, WIN_REWARD);
          rewardLine = `\n💰 @${winnerJid.split("@")[0]} earned *+$${WIN_REWARD}* coins!`;
        }
      } catch {
      // Keep the win announcement even if the economy service is unavailable,
      // but make the missing payout visible instead of silently swallowing it.
      rewardLine = "\n⚠️ The reward could not be credited right now.";
      }

      return sock.sendMessage(jid, {
        text:
`${board}
🏆 *@${winnerJid.split("@")[0]} wins!*${rewardLine}

Better luck next time, @${loserJid.split("@")[0]}!

Rematch: *.ttt @user*`,
        mentions: [winnerJid, loserJid],
      }, { quoted: msg });
    }

    // ── Game continues ────────────────────────────────────────────────────────
    const nextTurn = game.turn;
    return sock.sendMessage(jid, {
        text:
`${board}
🎯 Turn: @${nextTurn.split("@")[0]}

 Send only a number from *1-9* to make your move.`,
      mentions: [nextTurn],
    }, { quoted: msg });
  },
};
