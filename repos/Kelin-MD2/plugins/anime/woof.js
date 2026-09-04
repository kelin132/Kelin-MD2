import { sendReaction } from "./_helper.js";

export default {
  name: "woof",
  aliases: ["bark", "doggo"],
  description: "Send a woof",
  category: "anime",
  usage: ".woof",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "woof",
      soloCaption: `🐶 *Woof woof!*\n_Akira goes full dog mode!_`,
      duoCaption: (from, to) => `🐶 *${from} barked at ${to}!*\n_Woof woof~! 🐾_`,
      errorText: "❌ Couldn't fetch a woof gif. Try again!",
    });
  },
};
