export default {
  name: "ttt",
  description: "Play Tic-Tac-Toe",
  category: "games",
  usage: ".ttt",
  aliases: ["tictactoe"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const board = "⬜⬜⬜\n⬜⬜⬜\n⬜⬜⬜";
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Tic-Tac-Toe* — Game started!\n\n${board}\n\nReply with 1-9 to make your move.`,
    });
  },
};
