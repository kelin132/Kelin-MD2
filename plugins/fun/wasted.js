import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import path from "path";

async function uploadToCatbox(buffer, filename = "wanted.jpg") {
  const tempFile = path.join(os.tmpdir(), filename);

  fs.writeFileSync(tempFile, buffer);

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(tempFile));

  const { data } = await axios.post(
    "https://catbox.moe/user/api.php",
    form,
    {
      headers: form.getHeaders(),
    }
  );

  fs.unlinkSync(tempFile);

  return data.trim();
}

export default {
  name: "wanted",
  description: "Generate a Wanted poster from a replied image",
  category: "fun",
  usage: ".wanted (reply to an image)",
  aliases: ["wantedposter"],
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
            text: "❌ Reply to an image.\n\nExample:\nReply to a photo and send *.wanted*",
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
            text: "❌ The replied message is not an image.",
          },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        jid,
        {
          text: "🎨 Creating your wanted poster...",
        },
        { quoted: msg }
      );

      const media = await sock.downloadMediaMessage({
        key: {
          remoteJid: jid,
          id: msg.message.extendedTextMessage.contextInfo.stanzaId,
          participant:
            msg.message.extendedTextMessage.contextInfo