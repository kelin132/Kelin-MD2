import { sendReaction } from "./_helper.js";

export default {
  name: "lick",
  aliases: ["animelick"],
  description: "Lick someone — you absolute gremlin",
  category: "anime",
  usage: ".lick @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "lick",
      soloCaption: `👅 *Akira licks... something. Unknown target.*\n_I have no explanation for my behavior._`,
      duoCaption: (from, to) => `👅 *${from} licked ${to}!!*\n_NANI?! There are so many questions and zero answers 💀_`,
      errorText: "❌ Lick failed. Probably for the best.",
    });
  },
};
