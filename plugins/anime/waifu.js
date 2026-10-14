import { sendAnimeMedia } from "./_helper.js";

export default {
  name: "waifu",
  aliases: [],
  description: "Get a random anime waifu image",
  category: "anime",
  usage: ".waifu",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      await sendAnimeMedia({
        sock,
        msg,
        type: "waifu",
        allowStatic: true,
        caption:
`🌸 *Random Waifu Alert!*

_Treat her well or face my wrath, senpai 💢_

> Powered by anime media sources`,
      });
    } catch (err) {
      console.error("[waifu]", err.message);
      await sock.sendMessage(jid, { text: "❌ The waifu ran away. Try again!" }, { quoted: msg });
    }
  },
};
