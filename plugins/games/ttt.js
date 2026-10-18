import { startTicTacToe } from "../../lib/kordGames.mjs";
import { resolveTargetIdentity } from "../../lib/profileIdentity.mjs";

export default {
  name: "ttt",
  description: "Play TicTacToe with a lobby and raw text moves",
  category: "games",
  usage: ".ttt | .ttt @user",
  cooldown: 5,

  async run({ sock, msg, sender, prefix }) {
    const rawMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const mentioned = rawMentioned.length
      ? [await resolveTargetIdentity(rawMentioned[0], { sender, sock, chatId: msg.key.remoteJid })]
      : [];
    return startTicTacToe({ sock, msg, sender, mentioned, prefix });
  },
};
