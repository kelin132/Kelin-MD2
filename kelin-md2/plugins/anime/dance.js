import { sendReaction } from "./_helper.js";

export default {
  name: "dance",
  aliases: ["animedance", "groove"],
  description: "Show off your anime dance moves",
  category: "anime",
  usage: ".dance",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "dance",
      soloCaption: `💃 *Akira does an extremely dramatic anime dance*\n_No one asked but I DELIVERED. You're welcome~_`,
      duoCaption: (from, to) => `💃 *${from} is dragging ${to} to the dance floor!!*\n_No excuses. No escaping. We DANCE NOW._`,
      errorText: "❌ Dance failed. *trips* I meant to do that.",
    });
  },
};
