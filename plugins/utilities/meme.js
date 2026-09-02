import settings from "../../settings.cjs";
import {
  createSticker,
  downloadQuotedStickerOrImage,
  renderMemeSticker,
} from "../../lib/stickerTools.mjs";

export default {
  name: "meme",
  description: "Write text on a replied sticker or image",
  category: "utilities",
  usage: ".meme <text> (reply to a sticker or image)",
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const text = args.join(" ").trim();
    if (!text) {
      return sock.sendMessage(jid, {
        text: "✍️ Reply to a sticker or image and use *.meme <text>*.\n\nExample: *.meme when the bot finally works*",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      const { buffer } = await downloadQuotedStickerOrImage(msg);
      const rendered = await renderMemeSticker(buffer, text);
      const sticker = await createSticker(rendered, {
        pack: "AIDORU MEMES",
        author: settings.botName || "AIDORU",
      });

      await sock.sendMessage(jid, { sticker }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[meme]", error);
      const message = error.code === "NOQUOTE"
        ? "❌ Reply to a sticker or image first."
        : error.code === "NOT_STICKER_OR_IMAGE"
          ? "❌ The replied message must contain a sticker or image."
          : "❌ I couldn't write that text on the sticker.";
      await sock.sendMessage(jid, { text: message }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};