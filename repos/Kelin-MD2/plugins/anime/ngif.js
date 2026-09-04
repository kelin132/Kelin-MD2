import { sendReaction } from "./_helper.js";

export default {
  name: "ngif",
  aliases: ["nekogif", "nekoani"],
  description: "Send a random neko GIF",
  category: "anime",
  usage: ".ngif",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "ngif",
      soloCaption: `🐾 *Random Neko GIF*\n_Nyaa~! ✨_`,
      duoCaption: null,
      errorText: "❌ Couldn't fetch a neko gif. Try again!",
    });
  },
};
