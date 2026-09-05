import { sendReaction } from "./_helper.js";

export default {
  name: "cry",
  aliases: ["animecry", "sad"],
  description: "Express your sadness with anime tears",
  category: "anime",
  usage: ".cry",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "cry",
      soloCaption: `😭 *cries in anime*\n_It's okay senpai… let it out. I'm here~ 🌸_`,
      duoCaption: (from, to) => `😭 *${from} is crying because of ${to}*\n_Look what you did. Are you HAPPY now?!_`,
      errorText: "❌ Even the cry image failed. Now I'm crying too. 😭",
    });
  },
};
