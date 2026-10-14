import { sendAnimeMedia } from "./_helper.js";

export default {
  name: "neko",
  aliases: ["catgirl"],
  description: "Get a random anime neko image",
  category: "anime",
  usage: ".neko",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      await sendAnimeMedia({
        sock,
        msg,
        type: "neko",
        allowStatic: true,
        caption:
`🐱 *Nyan~!*

Here's your random anime neko!

> Powered by anime media sources`,
      });
    } catch (err) {
      console.error("[neko]", err.message);
      await sock.sendMessage(jid, { text: "❌ The neko ran away. Try again later!" }, { quoted: msg });
    }
  },
};
