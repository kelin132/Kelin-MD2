// plugins/image/invert.js — Invert image colors via PopCat API

import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "invert",
  aliases: ["invertcolors", "negative"],
  description: "Invert the colors of a replied image",
  category: "image",
  usage: ".invert (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url    = `https://api.popcat.xyz/invert?image=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "🔄 *Colors inverted!*" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("INVERT ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to invert image. Try again!" }, { quoted: msg });
    }
  },
};
