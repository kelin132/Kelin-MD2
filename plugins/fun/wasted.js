// plugins/fun/wasted.js
// .wasted — Overlay the GTA "Wasted" screen on a replied image

export default {
  name: "wasted",
  aliases: ["gtawasted"],
  description: "Put the GTA Wasted overlay on a replied image",
  category: "fun",
  usage: ".wasted (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: "❌ Reply to an image.\n\nExample:\nReply to a photo and send *.wasted*",
      }, { quoted: msg });
    }

    const image =
      quoted.imageMessage ||
      quoted.viewOnceMessageV2?.message?.imageMessage;

    if (!image) {
      return sock.sendMessage(jid, {
        text: "❌ The replied message is not an image.",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      // Download the replied image
      const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
      const stream  = await downloadContentFromMessage(image, "image");
      const chunks  = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer  = Buffer.concat(chunks);

      // Use some-random-api wasted endpoint
      const FormData = (await import("form-data")).default;
      const axios    = (await import("axios")).default;

      const form = new FormData();
      form.append("file", buffer, { filename: "image.jpg", contentType: "image/jpeg" });

      // Upload to catbox first so we have a URL
      const uploadForm = new FormData();
      uploadForm.append("reqtype", "fileupload");
      uploadForm.append("fileToUpload", buffer, { filename: "img.jpg", contentType: "image/jpeg" });

      const uploadRes = await axios.post("https://catbox.moe/user/api.php", uploadForm, {
        headers: uploadForm.getHeaders(),
        timeout: 15000,
      });
      const imageUrl = uploadRes.data.trim();

      if (!imageUrl.startsWith("https://")) throw new Error("Upload failed");

      const apiUrl = `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(imageUrl)}`;
      const imgRes = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 15000 });
      const result = Buffer.from(imgRes.data);

      await sock.sendMessage(jid, { image: result, caption: "💀 *WASTED*" }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[wasted]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ Failed to create wasted image: ${err.message}`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
