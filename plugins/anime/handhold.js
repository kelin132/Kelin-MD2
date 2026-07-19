import { sendReaction } from "./_helper.js";

export default {
  name: "handhold",
  aliases: ["holdhand", "holdme"],
  description: "Hold someone's hand — very lewd by anime standards",
  category: "anime",
  usage: ".handhold @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "handhold",
      soloCaption: `🤝 *Akira reaches out her hand shyly*\n_D-don't read into it! I just don't want you to get lost!!_`,
      duoCaption: (from, to) => `🤝 *${from} is holding hands with ${to}!!*\n_In anime this is basically a wedding proposal. Chat is LOSING IT 👀_`,
      errorText: "❌ Handhold failed. *shy wave instead*",
    });
  },
};
