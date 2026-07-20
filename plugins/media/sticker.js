export default {
  name: "sticker",
  description: "Convert a replied image or video into a sticker",
  category: "converter",
  usage: ".sticker",
  aliases: ["s", "stk"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, text }) {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          { text: "❌ Reply to an image or video." },
          { quoted: msg }
        );
      }

      // Download media
      const buffer = await sock.downloadMediaMessage(msg);

      let packname = process.env.STICKER_PACKNAME || "KELIN-MD";
      let author = process.env.STICKER_AUTHOR || "Kelin";

      if (text) {
        const parts = text.split(/[,;|]/).map(x => x.trim());
        packname = parts[0] || packname;
        author = parts[1] || author;
      }

      // Send sticker (replace with your sticker helper)
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          sticker: buffer,
          packname,
          author,
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "❌ Failed to create sticker." },
        { quoted: msg }
      );
    }
  }
};