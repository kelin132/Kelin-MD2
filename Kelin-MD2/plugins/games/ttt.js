import { startTicTacToe, deleteTicTacToe } from "../../lib/kordGames.mjs";

export default {
  name: "ttt",
  description: "Play TicTacToe with a lobby and raw text moves",
  category: "games",
  usage: ".ttt | .ttt @user",
  aliases: ["tictactoe"],
  cooldown: 5,

  async run({ sock, msg, sender, prefix }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const text = msg.message?.extendedTextMessage?.text || "";
    const argsText = text.replace(/^\S+\s*/, "").trim();
    if (argsText.toLowerCase() === "delete" || argsText.toLowerCase() === "del") {
      return deleteTicTacToe({ sock, msg });
    }
    return startTicTacToe({ sock, msg, sender, mentioned, prefix });
  },
};
