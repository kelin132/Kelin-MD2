import { sendReaction } from "./_helper.js";

export default {
  name: "blush",
  aliases: ["animeblush"],
  description: "Show off your anime blush",
  category: "anime",
  usage: ".blush",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "blush",
      soloCaption: `😳 *blushes intensely*\n_I-it's not like I'm embarrassed or anything!! Mou~_`,
      duoCaption: (from, to) => `😳 *${from} is blushing because of ${to}*\n_Ara ara~ someone's got a crush~ 🌸_`,
      errorText: "❌ Blush failed. I'm already red enough.",
    });
  },
};
