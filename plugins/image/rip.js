// plugins/image/rip.js — RIP gravestone meme via PopCat jail overlay + caption

import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "rip",
  aliases: ["ripmeme", "ripimage"],
  description: "Create a RIP gravestone meme with a replied image",
  category: "image",
  usage: ".rip (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      // Use popcat jail overlay (bars = "gone behind bars" / RIP aesthetic)
      const url = `https://api.popcat.xyz/jail?image=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, {
        image: { url },
        caption: "⚰️ *R.I.P.*\n\n_Gone but not forgotten..._",
      }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") {
        return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      }
      console.error("RIP ERROR:", err);
      await sock.sendMessage(jid, { text: "❌ Failed to create RIP meme. Try again!" }, { quoted: msg });
    }
  },
};
