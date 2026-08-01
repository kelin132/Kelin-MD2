import { sendReaction } from "./_helper.js";

export default {
  name: "pat",
  aliases: ["headpat", "animepat"],
  description: "Give someone a gentle anime head pat",
  category: "anime",
  usage: ".pat [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "pat",
      soloCaption: `🤚 *Akira pats your head gently~*\n_Good job today, you did well 🌸_`,
      duoCaption: (from, to) => `🤚 *${from} is giving ${to} head pats~*\n_So soft and wholesome, I'm going to cry 😭_`,
      errorText: "❌ Pat failed somehow. Still, there there.",
    });
  },
};
