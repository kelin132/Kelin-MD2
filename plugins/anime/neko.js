import axios from "axios";

export default {
  name: "neko",
  aliases: ["catgirl"],
  description: "Get a random anime neko image",
  category: "anime",
  usage: ".neko",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const { data } = await axios.get("https://api.waifu.pics/sfw/neko");

      await sock.sendMessage(
        jid,
        {
          image: { url: data.url },
          caption:
`🐱 *Nyan~!*

Here's your random anime neko!

> Powered by waifu.pics`,
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ The neko ran away. Try again later!",
        },
        { quoted: msg }
      );
    }
  },
};