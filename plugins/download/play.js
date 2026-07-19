import yts from "yt-search";
import ytdl from "@distube/ytdl-core";

export default {
  name: "play",
  description: "Search and play music from YouTube",
  category: "download",
  usage: ".play <song name>",
  aliases: ["song", "music"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ Example:\n.play Shape of You",
        },
        { quoted: msg }
      );
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text: "🔎 Searching YouTube...",
        },
        { quoted: msg }
      );

      const search = await yts(text);

      if (!search.videos.length) {
        return sock.sendMessage(
          jid,
          { text: "❌ No results found." },
          { quoted: msg }
        );
      }

      const video = search.videos[0];

      if (video.seconds > 600) {
        return sock.sendMessage(
          jid,
          {
            text: "❌ Songs longer than 10 minutes are not allowed.",
          },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        jid,
        {
          image: { url: video.thumbnail },
          caption:
`🎵 *${video.title}*

👤 Author: ${video.author.name}
⏱ Duration: ${video.timestamp}
👀 Views: ${video.views.toLocaleString()}

⬇️ Downloading audio...`,
        },
        { quoted: msg }
      );

      const stream = ytdl(video.url, {
        quality: "highestaudio",
        filter: "audioonly",
      });

      await sock.sendMessage(
        jid,
        {
          audio: stream,
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
          ptt: false,
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      sock