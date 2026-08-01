import { sendReaction } from "./_helper.js";

export default {
  name: "feed",
  aliases: ["feeds"],
  description: "Feed someone with an anime gif",
  category: "anime",
  usage: ".feed [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "feed",
      soloCaption: `🍱 *Akira offers you food~*\n_Here, eat up! You need the energy!_`,
      duoCaption: (from, to) => `🍱 *${from} is feeding ${to}!*\n_Aww, so caring~ 🌸_`,
      errorText: "❌ Couldn't fetch a feed gif. Try again!",
    });
  },
};
