import { downloadMediaBuffer, omegaDownload } from "../../lib/omegaDownload.js";

export default {
  name: "ytmp3",
  description: "Download YouTube audio as MP3",
  category: "download",
  usage: ".ytmp3 <url>",
  aliases: ["ymp3"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "2.0.0",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !/youtube\.com|youtu\.be/i.test(url)) {
      await sock.sendMessage(jid, {
        text: "Usage: .ytmp3 <YouTube URL>",
      }, { quoted: msg });
      return;
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading audio…" }, { quoted: msg });
      const media = await omegaDownload("play", { url: url.trim(), format: "mp3" });
      const file = await downloadMediaBuffer(media.url);
      const title = media.title || "YouTube Audio";
      const mimetype = file.mimetype.startsWith("audio/") ? file.mimetype : "audio/mpeg";

      await sock.sendMessage(jid, {
        audio: file.buffer,
        mimetype,
        fileName: `${title}.mp3`,
        ptt: false,
      }, { quoted: msg });
    } catch (err) {
      console.error("[ytmp3]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ YouTube audio download failed.\n\n_${err.message}_`,
      }, { quoted: msg });
    }
  },
};
