import { processTicTacToeMove } from "../../lib/kordGames.mjs";

export default {
  name: "m",
  description: "Compatibility command for a TicTacToe move",
  category: "games",
  usage: ".m <1-9>",
  aliases: ["move"],
  cooldown: 1,

  async run({ sock, msg, sender, args }) {
    return processTicTacToeMove({
      sock,
      msg,
      sender,
      input: args?.[0] || "",
    });
  },
};
