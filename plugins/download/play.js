export default {
  name: "play",
  description: "Play a song from YouTube",
  category: "download",
  usage: ".play <song name or URL>",
  aliases: ["music", "song"],
  cooldown: 15,
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .play <song name>\nExample: .play Blinding Lights" }, { quoted: msg });

    await sock.sendMessage(jid, { text: `🎵 Searching for: *${text}*...` }, { quoted: msg });

    try {
      let ytdl;
      try {
        ytdl = (await import("@distube/ytdl-core")).default;
      } catch {
        return sock.sendMessage(jid, { text: "❌ ytdl not installed.\nRun: npm install @distube/ytdl-core" }, { quoted: msg });
      }

      let videoId;
      if (/youtu\.?be/.test(text)) {
        const match = text.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        videoId = match?.[1];
      } else {
        const html = await fetch(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}&hl=en`,
          { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
        ).then((r) => r.text());
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (!match) return sock.sendMessage(jid, { text: "❌ No results found." }, { quoted: msg });
        videoId = match[1];
      }

      if (!videoId) return sock.sendMessage(jid, { text: "❌ Could not find a valid YouTube video." }, { quoted: msg });

      const info     = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const title    = info.videoDetails.title;
      const duration = parseInt(info.videoDetails.lengthSeconds);

      if (duration > 600) {
        return sock.sendMessage(jid, {
          text: `❌ Song too long (*${Math.ceil(duration / 60)} min*). Max 10 minutes.`,
        }, { quoted: msg });
      }

      await sock.sendMessage(jid, {
        text: `🎵 *${title}*\n⏱ ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}\n\n⬇️ Downloading...`,
      }, { quoted: msg });

      const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
        filter: "audioonly",
        quality: "lowestaudio",
      });

      await sock.sendMessage(jid, { audio: stream, mimetype: "audio/mpeg", ptt: false }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to play: ${err.message}` }, { quoted: msg });
    }
  },
};
