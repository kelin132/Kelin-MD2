import { sendReaction } from "./_helper.js";

export default {
  name: "neko",
  aliases: ["catgirl"],
  description: "Get a random anime neko (cat girl) image",
  category: "anime",
  usage: ".neko",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "neko",
      soloCaption: `🐱 *Nyan~* Here's your neko fix for the day!\n_Don't stare too long, baka 👀_`,
      duoCaption: (from, to) => `🐱 *${from} sent a neko to ${to}~*\n_Nyaa ehe~_`,
      errorText: "❌ The neko escaped. Try again!",
    });
  },
};
