import { sendReaction } from "./_helper.js";

export default {
  name: "wink",
  aliases: ["animewink"],
  description: "Wink at someone flirtatiously",
  category: "anime",
  usage: ".wink [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "wink",
      soloCaption: `😉 *winks at you*\n_Don't overthink it~ or do. I'm not stopping you. Ehe~_`,
      duoCaption: (from, to) => `😉 *${from} winked at ${to}~*\n_Ooooh?? 👀 Something's going on here and I want all the details_`,
      errorText: "❌ Wink failed. *blinks awkwardly instead*",
    });
  },
};
