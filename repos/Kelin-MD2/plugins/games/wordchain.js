import { startWordChain } from "../../lib/kordGames.mjs";

export default {
  name: "wcg",
  description: "Start a Kord-style Word Chain Game",
  category: "games",
  usage: ".wcg [easy|medium|hard] | .wcg start | .wcg end",
  cooldown: 2,

  async run({ sock, msg, sender, text, prefix }) {
    return startWordChain({ sock, msg, sender, text, prefix });
  },
};
