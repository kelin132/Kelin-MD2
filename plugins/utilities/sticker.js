// plugins/utilities/sticker.js
// .sticker — Convert a replied image or video to a WhatsApp sticker
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const { Sticker, StickerTypes } = _require("wa-sticker-formatter");

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".sticker (reply to an image)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: `🖼️ *STICKER MAKER*\n\nReply to an *image* or *video* with *.sticker*`,
      }, { quoted: msg });
    }

    const imgMsg   = quoted.imageMessage;
    const vidMsg   = quoted.videoMessage;
    const mediaMsg = imgMsg || vidMsg;

    if (!mediaMsg) {
      return sock.sendMessage(jid, {
        text: `❌ Only images and videos can be converted to stickers.`,
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      const type   = imgMsg ? "image" : "video";
      const stream = await downloadContentFromMessage(mediaMsg, type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // Parse pack/author from args: .sticker <pack> | <author>
      const parts  = args.join(" ").split("|");
      const pack   = parts[0]?.trim() || "Kelin MD";
      const author = parts[1]?.trim() || "Bot";

      const sticker = new Sticker(buffer, {
        pack,
        author,
        type:    StickerTypes.FULL,
        quality: 70,
      });

      const stickerBuffer = await sticker.toBuffer();

      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[sticker]", err);
      await sock.sendMessage(jid, {
        text: `❌ Failed to create sticker. Make sure the image isn't too large.`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
