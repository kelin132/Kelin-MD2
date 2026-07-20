import { sendReaction } from "./_helper.js";

export default {
  name: "tickle",
  aliases: ["tickles"],
  description: "Tickle someone with an anime gif",
  category: "anime",
  usage: ".tickle [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "tickle",
      soloCaption: `🫱 *Akira tickles you!*\n_Hehehe~ stop squirming!_`,
      duoCaption: (from, to) => `🫱 *${from} tickled ${to}!*\n_Hahaha stop it! 😂_`,
      errorText: "❌ Couldn't fetch a tickle gif. Try again!",
    });
  },
};
