import { sendReaction } from "./_helper.js";

export default {
  name: "kiss",
  aliases: ["animekiss"],
  description: "Send an anime kiss — mention someone to kiss them",
  category: "anime",
  usage: ".kiss [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "kiss",
      soloCaption: `😘 *Akira kisses you on the cheek~*\n_D-don't read into it!! mou~_`,
      duoCaption: (from, to) => `😘 *${from} kissed ${to}!!*\n_OOOooo 👀 chat is NOT ready for this—_`,
      errorText: "❌ Kiss failed. Embarrassing. Try again.",
    });
  },
};
