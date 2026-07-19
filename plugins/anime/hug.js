import { sendReaction } from "./_helper.js";

export default {
  name: "hug",
  aliases: ["animehug"],
  description: "Send a warm anime hug — mention someone to hug them",
  category: "anime",
  usage: ".hug [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "hug",
      soloCaption: `🤗 *Akira sends you a warm hug~*\n_You look like you needed that, senpai!_`,
      duoCaption: (from, to) => `🤗 *${from} just hugged ${to}!*\n_Awww that's so wholesome~ 🌸_`,
      errorText: "❌ Couldn't fetch a hug image. Try again!",
    });
  },
};
