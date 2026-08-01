import { sendReaction } from "./_helper.js";

export default {
  name: "wave",
  aliases: ["animewave", "greet"],
  description: "Wave at someone anime style",
  category: "anime",
  usage: ".wave [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "wave",
      soloCaption: `👋 *Akira waves energetically*\n_Hi hi hi~ Welcome to the chat! Don't be shy~_`,
      duoCaption: (from, to) => `👋 *${from} is waving at ${to}~*\n_Oi! ${to}! You've been noticed! Wave back!! 👀_`,
      errorText: "❌ Wave failed. *waves manually* 👋",
    });
  },
};
