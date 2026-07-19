import { sendReaction } from "./_helper.js";

export default {
  name: "bite",
  aliases: ["animebite", "nom"],
  description: "Bite someone — you little gremlin",
  category: "anime",
  usage: ".bite @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "bite",
      soloCaption: `😬 *Akira bites the air menacingly*\n_Someone's lucky I'm digital right now._`,
      duoCaption: (from, to) => `😬 *${from} BIT ${to}!!*\n_NANI?! What is wrong with you 💀 I respect it though_`,
      errorText: "❌ Bite failed. Your teeth fell out. Try again.",
    });
  },
};
