import { startTicTacToe } from "../../lib/kordGames.mjs";

export default {
  name: "ttt",
  description: "Play TicTacToe with a lobby and raw text moves",
  category: "games",
  usage: ".ttt | .ttt @user",
  cooldown: 5,

  async run({ sock, msg, sender, prefix }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    return startTicTacToe({ sock, msg, sender, mentioned, prefix });
  },
};
