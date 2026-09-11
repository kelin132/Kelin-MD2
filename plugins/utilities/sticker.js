// plugins/utilities/sticker.js
// .sticker — Convert a replied image or video to a WhatsApp sticker
// Uses the repository's sticker formatter so pack metadata stays attached to the sticker.

import settings from "../../settings.cjs";
import {
  createSticker,
  downloadQuotedMedia,
} from "../../lib/stickerTools.mjs";

export default {
  name: "sticker",
  description: "Convert a replied image/video to a WhatsApp sticker",
  category: "utilities",
  usage: ".s (reply to an image or video)",
  aliases: ["s", "stiker", "toSticker"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid  = msg.key.remoteJid;

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      const { buffer } = await downloadQuotedMedia(msg, ["image", "video"]);

      const publisher = settings.botName || "AIDORU";

      const stickerBuffer = await createSticker(buffer, {
        pack: "", // Clears the sticker pack name
        author: publisher,
      });

      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[sticker]", err);
      const message = err.code === "NOQUOTE"
        ? "🖼️ *STICKER MAKER*\n\nReply to an *image* or *video* with *.s*"
        : err.code === "NOT_SUPPORTED_MEDIA"
          ? "❌ Only images and videos can be converted to stickers."
          : "❌ Failed to create sticker. Make sure the image isn't too large.";
      await sock.sendMessage(jid, {
        text: message,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};
