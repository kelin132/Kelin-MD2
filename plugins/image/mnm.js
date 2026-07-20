import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "mnm",
  aliases: ["mms", "candy"],
  description: "Turn a replied image into an M&M candy character",
  category: "image",
  usage: ".mnm (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url = `https://api.nexoracle.com/image-processing/mnm?apikey=free_key@maher_apis&img=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "🍬 M&M effect applied!" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to apply M&M effect. Try again!" }, { quoted: msg });
    }
  },
};
