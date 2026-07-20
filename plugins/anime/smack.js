import { sendReaction } from "./_helper.js";

export default {
  name: "smack",
  aliases: ["animesmack"],
  description: "Smack someone with an anime GIF — mention someone to smack them",
  category: "anime",
  usage: ".smack @user",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "smack",
      soloCaption: `💥 *Akira winds up a smack!*\n_Don't test me—_`,
      duoCaption: (from, to) => `💥 *${from} smacked ${to}!!*\n_WHACK! That had to hurt 😵_`,
      errorText: "❌ Couldn't fetch a smack GIF. Try again!",
    });
  },
};
