import { deleteTicTacToe } from "../../lib/kordGames.mjs";

export default {
  name: "delttt",
  description: "Delete the running TicTacToe game",
  category: "games",
  cooldown: 2,

  async run({ sock, msg }) {
    return deleteTicTacToe({ sock, msg });
  },
};
