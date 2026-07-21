import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import path from "path";

async function uploadToCatbox(buffer, filename = "wanted.jpg") {
  const temp = path.join(os.tmpdir(), filename);

  fs.writeFileSync(temp, buffer);

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(temp));

  const { data } = await axios.post(
    "https://catbox.moe/user/api.php",
    form,
    {
      headers: form.getHeaders(),
    }
  );

  fs.unlinkSync(temp);

  return data;
}

export default {
  name: "wanted",
  description: "Create a Wanted poster sticker",
  category: "sticker",
  usage: ".wanted (reply to an image)",
  cooldown: 5,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    try {
      const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return await sock.sendMessage(
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
        return await sock.sendMessage(
          jid,
          {
            text: "❌ The replied message must be an image.",
          },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        jid,
        {
          text: "🎨 Creating wanted sticker...",
        },
        { quoted: msg }
      );

      const media = await sock.downloadMediaMessage({
        key: {
          remoteJid: jid,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          participant:
            msg.message.extendedTextMessage.contextInfo.participant,
        },
        message: quoted,
      });

      const imageUrl = await uploadToCatbox(media);

      const stickerUrl =
        `https://apis.davidcyril.name.ng/canvas/wanted?image=${encodeURIComponent(imageUrl)}`;

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
      console.error("[wanted]", err);

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