import { sendReaction } from "./_helper.js";

export default {
  name: "meow",
  aliases: ["meows", "mrrr"],
  description: "Send a meow at someone",
  category: "anime",
  usage: ".meow [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "meow",
      soloCaption: `🐱 *Nyaa~!*\n_Akira says meow!_`,
      duoCaption: (from, to) => `🐱 *${from} meowed at ${to}!*\n_Nyaa~ pay attention to me! 🐾_`,
      errorText: "❌ Couldn't fetch a meow gif. Try again!",
    });
  },
};
