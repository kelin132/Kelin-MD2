import { sendReaction } from "./_helper.js";

export default {
  name: "kill",
  aliases: ["animekill"],
  description: "Dramatically defeat someone anime style",
  category: "anime",
  usage: ".kill @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "kill",
      soloCaption: `⚔️ *Akira unsheathes her katana dramatically*\n_Someone's name was written in the death note today._`,
      duoCaption: (from, to) => `⚔️ *${from} has DEFEATED ${to}!!*\n_A clean finish. Respect. Moment of silence for ${to}. 🕯️_`,
      errorText: "❌ Kill failed. Your target survived. Consider training more.",
    });
  },
};
