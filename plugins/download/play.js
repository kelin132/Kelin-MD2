/**
 * KELIN MD — .play command
 * Searches YouTube and downloads audio via the GiftedTech API.
 * Adapted from dara-studio-bot reference (uses gifted API instead of direct ytdl stream).
 */
import yts from "yt-search";
import { get } from "../../lib/gifted.js";

// ── Search YouTube ────────────────────────────────────────────────────────────

async function ytSearch(input) {
  if (/youtube\.com|youtu\.be/i.test(input)) {
    return { url: input, title: input, thumbnail: null, duration: "", author: "", views: "" };
  }
  const { videos } = await yts(input);
  if (!videos?.length) throw new Error("No results found for: " + input);
  const v = videos[0];
  return {
    url:       v.url,
    title:     v.title,
    thumbnail: v.thumbnail || v.image || null,
    duration:  v.timestamp || "",
    author:    v.author?.name || "",
    views:     v.views ? Number(v.views).toLocaleString() : "",
  };
}

function pickDl(result) {
  if (!result) return null;
  return result.download_url || result.audio_url || result.url || result.link || null;
}

async function sendBanner(sock, jid, msg, meta, action) {
  const caption = [
    `🎵 *${meta.title}*`,
    meta.author   ? `👤 ${meta.author}`       : "",
    meta.duration ? `⏱️ ${meta.duration}`     : "",
    meta.views    ? `👁️ ${meta.views} views`  : "",
    "",
    `⬇️ _${action}_`,
  ].filter(Boolean).join("\n");

  if (meta.thumbnail) {
    try {
      return await sock.sendMessage(jid, { image: { url: meta.thumbnail }, caption }, { quoted: msg });
    } catch { /* fallthrough to text */ }
  }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg });
}

// ── .play — YouTube audio (128kbps) ─────────────────────────────────────────

export default {
  name: "play",
  description: "Search and download audio from YouTube (128 kbps)",
  category: "download",
  usage: ".play <song name or YouTube URL>",
  aliases: ["song", "music", "mp3", "ytmp3"],
  cooldown: 15,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🎵 Usage: *.play <song name or YouTube URL>*\n\nExample: .play Shape of You"
      }, { quoted: msg });
    }

    try {
      const meta = await ytSearch(text);
      await sendBanner(sock, jid, msg, meta, "Downloading audio…");

      const data = await get("/download/ytaudio", { url: meta.url });
      const dl   = pickDl(data?.result);
      if (!dl) throw new Error("No download URL returned from API");

      const title = data?.result?.title || meta.title;

      await sock.sendMessage(jid, {
        audio:    { url: dl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        ptt:      false,
      }, { quoted: msg });

    } catch (err) {
      console.error("[play]", err.message);
      await sock.sendMessage(jid, {
        text: "❌ Audio download failed. Try again or use a direct YouTube URL."
      }, { quoted: msg });
    }
  },
};
