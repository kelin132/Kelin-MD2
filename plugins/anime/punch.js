import { sendReaction } from "./_helper.js";

export default {
  name: "punch",
  aliases: ["animepunch"],
  description: "Punch someone with an anime GIF — mention someone to punch them",
  category: "anime",
  usage: ".punch @user",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "punch",
      soloCaption: `👊 *Akira throws a punch into the air!*\n_Better watch out~_`,
      duoCaption: (from, to) => `👊 *${from} punched ${to} right in the face!!*\n_KAPOW! You deserved it 💢_`,
      errorText: "❌ Couldn't fetch a punch GIF. Try again!",
    });
  },
};
