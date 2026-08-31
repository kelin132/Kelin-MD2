import { deleteWordChain } from "../../lib/kordGames.mjs";

export default {
  name: "delwcg",
  description: "Delete the running Word Chain game",
  category: "games",
  cooldown: 2,

  async run({ sock, msg }) {
    return deleteWordChain({ sock, msg });
  },
};
