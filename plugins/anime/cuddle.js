import { sendReaction } from "./_helper.js";

export default {
  name: "cuddle",
  aliases: ["animecuddle", "snuggle"],
  description: "Cuddle someone with warm anime energy",
  category: "anime",
  usage: ".cuddle [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "cuddle",
      soloCaption: `🥺 *Akira wraps you in a cozy cuddle~*\n_Don't tell anyone I did this. Especially not Kelin._`,
      duoCaption: (from, to) => `🥺 *${from} is cuddling ${to}~*\n_Ara ara~ someone is feeling affectionate today 🌸_`,
      errorText: "❌ Cuddle failed. Here's a virtual one instead. *hugs*",
    });
  },
};
