// plugins/utilities/sticker.js
// .sticker — Convert a replied image or video to a WhatsApp sticker
// Uses the repository's sticker formatter so pack metadata stays attached to the sticker.

import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import stickerFormatter from "wa-sticker-formatter";
// Settings imported from env
const botName = process.env.BOT_NAME || "AKIRA-DISCORD";

const { Sticker, StickerTypes } = stickerFormatter;

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

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".s [word] (reply to an image or video)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;
    const ctx  = getContext(msg);
    const quoted = unwrapMessage(ctx?.quotedMessage);

    if (!quoted) {
      return sock.sendMessage(jid, {
        text: `🖼️ *STICKER MAKER*\n\nReply to an *image* or *video* with *.s [word]*\nExample: *.s hello* → sticker pack: hello | AIDORU`,
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

      // The optional argument is metadata for the WhatsApp sticker pack.
      // It is intentionally not rendered into the sticker artwork.
      const requestedPackName = args.join(" ").trim().replace(/\s+/g, " ").slice(0, 48);
      const packName = requestedPackName
        ? `${requestedPackName} | AIDORU`
        : "AIDORU";
      const publisher = botName;

      const stickerBuffer = await new Sticker(buffer, {
        pack: packName,
        author: publisher,
        type: StickerTypes.FULL,
        quality: 80,
      }).toBuffer();

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
