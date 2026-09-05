import { sendReaction } from "./_helper.js";

export default {
  name: "smug",
  aliases: ["animesmug"],
  description: "Pull off your best smug anime face",
  category: "anime",
  usage: ".smug",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "smug",
      soloCaption: `😏 *Akira puts on her most insufferable smug face*\n_I'm always right. You know this. Accept it._`,
      duoCaption: (from, to) => `😏 *${from} is being insufferably smug at ${to}*\n_The audacity. The confidence. Honestly? Respect. 😭_`,
      errorText: "❌ Smug face failed. *smirks anyway*",
    });
  },
};
