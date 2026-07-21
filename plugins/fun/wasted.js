import { canvas } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "wanted",
  description: "Create a Wanted poster sticker",
  category: "sticker",
  usage: ".wanted (reply to an image)",
  aliases: [],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return sock.sendMessage(
          jid,
          {
            text: "❌ Reply to an image.\n\nExample:\nReply to a photo and type *.wanted*",
          },
          { quoted: msg }
        );
      }

      const image =
        quoted.imageMessage ||
        quoted.viewOnceMessageV2?.message?.imageMessage;

      if (!image) {
        return sock.sendMessage(
          jid,
          {
            text: "❌ The replied message is not an image.",
          },
          { quoted: msg }
        );
      }

      const media = await sock.downloadMediaMessage({
        key: {
          remoteJid: jid,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          participant:
            msg.message.extendedTextMessage.contextInfo.participant,
        },
        message: quoted,
      });

      const upload = await axios.post(
        "https://telegra.ph/upload",
        media,
        {
          headers: {
            "Content-Type": "image/jpeg",
          },
        }
      );

      const imageUrl = "https://telegra.ph" + upload.data[0].src;

      const stickerUrl =
        `https://api.dhamzxploit.my.id/api/canvas/wanted?url=${encodeURIComponent(imageUrl)}`;

      await sock.sendMessage(
        jid,
        {
          sticker: {
            url: stickerUrl,
          },
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text: "❌ Failed to create the wanted sticker.",
        },
        { quoted: msg }
      );
    }
  },
};