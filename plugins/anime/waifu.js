import axios from "axios";

export default {
  name: "waifu",
  aliases: ["anime"],
  description: "Get a random anime waifu image",
  category: "anime",
  usage: ".waifu",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const { data } = await axios.get("https://api.waifu.pics/sfw/waifu");

      await sock.sendMessage(
        jid,
        {
          image: { url: data.url },
          caption: `🌸 *Random Waifu Alert!*

_Treat her well or face my wrath, senpai 💢_

> Powered by waifu.pics`,
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ The waifu ran away. Try again!",
        },
        { quoted: msg }
      );
    }
  },
};