import { sendReaction } from "./_helper.js";

export default {
  name: "animewallpaper",
  aliases: ["awallpaper", "aniwlp"],
  description: "Send a random anime wallpaper",
  category: "anime",
  usage: ".animewallpaper",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "wallpaper",
      soloCaption: `🖼️ *Random Anime Wallpaper*\n_Enjoy the view~ ✨_`,
      duoCaption: null,
      errorText: "❌ Couldn't fetch a wallpaper. Try again!",
    });
  },
};
