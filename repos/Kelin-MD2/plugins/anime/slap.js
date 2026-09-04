import { sendReaction } from "./_helper.js";

export default {
  name: "slap",
  aliases: ["animeslap"],
  description: "Slap someone with anime energy — mention them",
  category: "anime",
  usage: ".slap @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "slap",
      soloCaption: `💢 *Akira slaps the air aggressively*\n_Someone deserved this and you know who you are._`,
      duoCaption: (from, to) => `💢 *${from} SLAPPED ${to}!!*\n_The audacity… the drama… I love it 😭_`,
      errorText: "❌ Slap missed. Embarrassing for you. Try again.",
    });
  },
};
