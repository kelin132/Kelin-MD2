import { sendReaction } from "./_helper.js";

export default {
  name: "yeet",
  aliases: ["animeyeet", "throw"],
  description: "YEET someone into the stratosphere",
  category: "anime",
  usage: ".yeet @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "yeet",
      soloCaption: `🚀 *Akira yeeted something into the void*\n_It deserved it. No further questions._`,
      duoCaption: (from, to) => `🚀 *${from} YEETED ${to} INTO ANOTHER DIMENSION!!*\n_They are gone. They are in space now. Goodbye 👋_`,
      errorText: "❌ Yeet failed. Physics is a coward.",
    });
  },
};
