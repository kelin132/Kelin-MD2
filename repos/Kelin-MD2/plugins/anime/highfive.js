import { sendReaction } from "./_helper.js";

export default {
  name: "highfive",
  aliases: ["hi5", "clap"],
  description: "High five someone for their wins",
  category: "anime",
  usage: ".highfive [@user]",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "highfive",
      soloCaption: `🙌 *Akira holds up a hand confidently*\n_Don't leave me hanging senpai— *nervous sweating*_`,
      duoCaption: (from, to) => `🙌 *${from} high-fived ${to}!!*\n_LET'S GOOOO! Whatever they did, it deserved that!_`,
      errorText: "❌ High five missed. *awkward hand retract* That never happened.",
    });
  },
};
