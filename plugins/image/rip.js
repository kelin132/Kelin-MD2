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
      const url = `https://api.nexoracle.com/image-processing/rip?apikey=free_key@maher_apis&img=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "⚰️ RIP..." }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to create RIP meme. Try again!" }, { quoted: msg });
    }
  },
};
