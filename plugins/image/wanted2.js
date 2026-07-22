// plugins/image/wanted2.js — WANTED poster via PopCat API

import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "wantedmeme",
  aliases: ["wanted2", "wanted", "wantedposter"],
  description: "Create a WANTED poster from a replied image",
  category: "image",
  usage: ".wantedmeme (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url    = `https://api.popcat.xyz/wanted?image=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "🤠 *WANTED — Dead or Alive!*" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("WANTED ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to create wanted poster. Try again!" }, { quoted: msg });
    }
  },
};
