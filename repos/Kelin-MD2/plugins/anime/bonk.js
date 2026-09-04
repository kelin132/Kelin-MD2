import { sendReaction } from "./_helper.js";

export default {
  name: "bonk",
  aliases: ["animebonk"],
  description: "Bonk someone on the head — go to horny jail",
  category: "anime",
  usage: ".bonk @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "bonk",
      soloCaption: `🔨 *Akira bonks you on the head*\n_Whatever you were thinking — stop it. RIGHT NOW._`,
      duoCaption: (from, to) => `🔨 *${from} BONKED ${to}!*\n_Go to horny jail. Directly. Do not pass go. 💀_`,
      errorText: "❌ Bonk failed. You escape this time.",
    });
  },
};
