// plugins/utilities/sticker.js
// .sticker — Convert a replied image or video to a WhatsApp sticker

import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

const STICKER_PACK_NAME = "𝐀𝐈𝐃𝐎𝐑𝐔";

function getContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.buttonsResponseMessage?.contextInfo ||
    null
  );
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 4 && current; i += 1) {
    const wrapped =
      current.ephemeralMessage ||
      current.viewOnceMessage ||
      current.viewOnceMessageV2 ||
      current.viewOnceMessageV2Extension;
    if (!wrapped?.message) break;
    current = wrapped.message;
  }
  return current;
}

/**
 * Convert media and write valid WhatsApp metadata through wa-sticker-formatter.
 * Its WebP muxer is important here: hand-written EXIF chunks can make WhatsApp
 * reject an otherwise valid-looking sticker with "can't view sticker info".
 */
async function toStickerBuffer(inputBuffer, memberName) {
  const publisher = memberName
    ? `(${memberName}) | ${STICKER_PACK_NAME}`
    : STICKER_PACK_NAME;

  return new Sticker(inputBuffer, {
    pack: STICKER_PACK_NAME,
    author: publisher,
    type: StickerTypes.FULL,
    quality: 80,
  }).toBuffer();
}

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".sticker [your name] (reply to an image or video)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const ctx  = getContext(msg);
    const quoted = unwrapMessage(ctx?.quotedMessage);

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

      // The pack name is fixed. Members can optionally provide the publisher
      // name, which is shown beside it in the requested format.
      const memberName = args
        .join(" ")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 60);

      const stickerBuffer = await toStickerBuffer(buffer, memberName);

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
