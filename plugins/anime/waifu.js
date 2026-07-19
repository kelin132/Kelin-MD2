import { sendReaction } from "./_helper.js";

export default {
  name: "waifu",
  aliases: ["anime"],
  description: "Get a random anime waifu image",
  category: "anime",
  usage: ".waifu",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "waifu",
      soloCaption: `🌸 *Random Waifu Alert!*\n_Treat her well or face my wrath, senpai 💢_`,
      duoCaption: (from, to) => `🌸 *${from} sent a waifu to ${to}~*`,
      errorText: "❌ The waifu ran away. Try again!",
    });
  },
};
