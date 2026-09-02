import settings from "../../settings.cjs";
import {
  createSticker,
  downloadQuotedStickerOrImage,
  formatPackName,
} from "../../lib/stickerTools.mjs";

export default {
  name: "take",
  description: "Repack a sticker with your name and AIDORU branding",
  category: "utilities",
  usage: ".take (reply to a sticker)",
  cooldown: 5,

  async run({ sock, msg, pushName, sender }) {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });

    try {
      const quoted = await downloadQuotedStickerOrImage(msg);
      if (quoted.type !== "sticker") {
        throw Object.assign(new Error("NOT_STICKER"), { code: "NOT_STICKER" });
      }

      const userName = pushName || msg.pushName || sender?.split("@")[0] || "AIDORU User";
      const sticker = await createSticker(quoted.buffer, {
        pack: formatPackName(userName),
        author: settings.botName || "AIDORU",
      });

      await sock.sendMessage(jid, { sticker }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[take]", error);
      const message = error.code === "NOQUOTE"
        ? "❌ Reply to a sticker first."
        : error.code === "NOT_STICKER"
          ? "❌ *.take* only works when you reply to a sticker."
          : error.code === "NOT_STICKER_OR_IMAGE"
            ? "❌ The replied message is not a sticker."
            : "❌ I couldn't repack that sticker.";
      await sock.sendMessage(jid, { text: message }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    }
  },
};