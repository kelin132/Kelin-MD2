import { getAnimeGif } from "./_helper.js";

export default {
  name: "waifu",
  aliases: ["anime"],
  description: "Get a random anime waifu image",
  category: "anime",
  usage: ".waifu",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const { url } = await getAnimeGif("waifu");

      await sock.sendMessage(
        jid,
        {
          image: { url },
          caption:
`🌸 *Random Waifu Alert!*

_Treat her well or face my wrath, senpai 💢_

> Powered by nekos.best`,
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("[waifu]", err.message);
      await sock.sendMessage(jid, { text: "❌ The waifu ran away. Try again!" }, { quoted: msg });
    }
  },
};
