import { sendReaction } from "./_helper.js";

export default {
  name: "foxgirl",
  aliases: ["fox", "kitsune"],
  description: "Send a cute fox girl image",
  category: "anime",
  usage: ".foxgirl",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "fox_girl",
      soloCaption: `🦊 *A fox girl appears!*\n_Konkon~ 🌸_`,
      duoCaption: (from, to) => `🦊 *${from} summoned a fox girl for ${to}!*\n_Konkon~! 🧡_`,
      errorText: "❌ Couldn't fetch a fox girl image. Try again!",
    });
  },
};
