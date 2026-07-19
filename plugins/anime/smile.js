import { sendReaction } from "./_helper.js";

export default {
  name: "smile",
  aliases: ["animesmile", "happy"],
  description: "Share a warm anime smile",
  category: "anime",
  usage: ".smile",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "smile",
      soloCaption: `😊 *Akira beams at you with the power of a thousand suns*\n_You'd better smile back or I'll be genuinely upset~_`,
      duoCaption: (from, to) => `😊 *${from} is smiling because of ${to}~*\n_That's adorable. I'm not crying. You're crying._`,
      errorText: "❌ Smile failed but here's one from me anyway → 😊",
    });
  },
};
