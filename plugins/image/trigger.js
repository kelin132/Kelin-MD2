import { getQuotedImageUrl, noQuoteText } from "./_imageHelper.js";

export default {
  name: "trigger",
  aliases: ["triggered", "triggermeme"],
  description: "Add a triggered meme effect to a replied image",
  category: "image",
  usage: ".trigger (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    try {
      const imgUrl = await getQuotedImageUrl(sock, msg);
      const url = `https://api.nexoracle.com/image-processing/trigger?apikey=free_key@maher_apis&img=${encodeURIComponent(imgUrl)}`;
      await sock.sendMessage(jid, { image: { url }, caption: "😡 TRIGGERED!!" }, { quoted: msg });
    } catch (err) {
      if (err.message === "NOQUOTE" || err.message === "NOIMAGE") return sock.sendMessage(jid, { text: noQuoteText() }, { quoted: msg });
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to apply trigger effect. Try again!" }, { quoted: msg });
    }
  },
};
