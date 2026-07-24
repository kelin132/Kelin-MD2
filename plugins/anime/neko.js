import { getAnimeGif } from "./_helper.js";

export default {
  name: "neko",
  aliases: ["catgirl"],
  description: "Get a random anime neko image",
  category: "anime",
  usage: ".neko",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const { url } = await getAnimeGif("neko");

      await sock.sendMessage(
        jid,
        {
          image: { url },
          caption:
`🐱 *Nyan~!*

Here's your random anime neko!

> Powered by nekos.best`,
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error("[neko]", err.message);
      await sock.sendMessage(jid, { text: "❌ The neko ran away. Try again later!" }, { quoted: msg });
    }
  },
};
