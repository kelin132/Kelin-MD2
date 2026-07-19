import { sendReaction } from "./_helper.js";

export default {
  name: "poke",
  aliases: ["animepoke"],
  description: "Poke someone annoyingly",
  category: "anime",
  usage: ".poke @user",

  async run({ sock, msg, sender }) {
    await sendReaction({
      sock, msg, sender,
      type: "poke",
      soloCaption: `👉 *Akira pokes you*\n_…poke poke poke. Are you even alive? Hello???_`,
      duoCaption: (from, to) => `👉 *${from} won't stop poking ${to}*\n_Someone tell them to stop 💀 this is harassment_`,
      errorText: "❌ Poke failed. *pokes you with an error message instead*",
    });
  },
};
