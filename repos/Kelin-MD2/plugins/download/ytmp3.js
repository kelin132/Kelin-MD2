import yts from "yt-search";
import { fetchAudio } from "./play.js";

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
  version: "3.0.0",

  async run({ sock, msg, args, text }) {
    const jid = msg.key.remoteJid;
    const input = String(text || args.join(" ") || "").trim();

    if (!input || !/youtube\.com|youtu\.be/i.test(input)) {
      await sock.sendMessage(jid, {
        text: "Usage: .ytmp3 <YouTube URL>",
      }, { quoted: msg });
      return;
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading audio…" }, { quoted: msg });
      const { videos } = await yts(input);
      const meta = videos?.[0];
      const videoUrl = meta?.url || input;
      const title = meta?.title || "YouTube Audio";
      const file = await fetchAudio(videoUrl, title);
      const mimetype = String(file.mimetype || "audio/mpeg").startsWith("audio/")
        ? file.mimetype
        : "audio/mpeg";

      await sock.sendMessage(jid, {
        audio: file.buffer,
        mimetype,
        fileName: `${title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120)}.mp3`,
        ptt: false,
      }, { quoted: msg });
    } catch (err) {
      console.error("[ytmp3]", err?.stack || err?.message || err);
      await sock.sendMessage(jid, {
        text: "❌ This audio couldn't be downloaded. Try again later!",
      }, { quoted: msg });
    }
  },
};
