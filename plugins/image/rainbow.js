import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "rainbow",
  aliases: ["rainbowfilter"],
  description: "Apply a rainbow filter to a replied image",
  category: "image",
  usage: ".rainbow (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url = `https://api.nexoracle.com/image-processing/rainbow?apikey=free_key@maher_apis&img=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "🌈 Rainbow effect applied!" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to apply rainbow filter. Try again!" }, { quoted: msg });
    }
  },
};
