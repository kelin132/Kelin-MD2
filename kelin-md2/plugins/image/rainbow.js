// plugins/image/rainbow.js — Drip/rainbow effect via PopCat API

import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "rainbow",
  aliases: ["rainbowfilter", "drip"],
  description: "Apply a colorful drip effect to a replied image",
  category: "image",
  usage: ".rainbow (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url    = `https://api.popcat.xyz/drip?image=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "🌈 *Drip effect applied!*" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("RAINBOW ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to apply rainbow effect. Try again!" }, { quoted: msg });
    }
  },
};
