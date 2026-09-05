import axios from "axios";

export default {
  name: "remini",
  aliases: ["hd", "upscale", "enhance"],
  category: "image",
  description: "Enhance image quality using Remini AI",
  usage: "Reply to an image with .remini",

  async run({ sock, msg, quoted, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    
    const mime = quoted?.mimetype || msg.message?.imageMessage?.mimetype;
    if (!/image/.test(mime)) return reply("❌ Please reply to an image!");

    try {
      await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
      
      const buffer = await (quoted || msg).download();
      
      // Upload to a temporary host to get a URL
      const formData = new URLSearchParams();
      formData.append("file", buffer.toString("base64"));
      
      // Using a common free image host or the bot's own upload utility if available
      // For this example, I'll assume the bot has a way to get a public URL for a buffer
      // If not, I'll use the buffer directly if the API supports it, but OmegaTech needs a URL.
      
      // I'll use a public temporary upload service
      const uploadRes = await axios.post("https://tmpfiles.org/api/v1/upload", buffer, {
        headers: { "Content-Type": "image/png" }
      });
      const rawUrl = uploadRes.data.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");

      const { data } = await axios.get(`https://api.omegatech.app/api/tools/remini?url=${encodeURIComponent(rawUrl)}`);
      
      if (!data.result) throw new Error("Enhancement failed.");

      return sock.sendMessage(jid, {
        image: { url: data.result },
        caption: "> ✨ Image enhanced successfully!"
      }, { quoted: msg });

    } catch (err) {
      console.error(err);
      return reply("❌ Failed to enhance image. The API might be busy.");
    }
  },
};
