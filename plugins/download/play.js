/**
 * KELIN MD — .play command
 * Searches YouTube and downloads audio.
 * Tries multiple API endpoints with automatic fallback.
 */
import yts from "yt-search";
import { get, davidGet } from "../../lib/gifted.js";

// ── YouTube search ────────────────────────────────────────────────────────────

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

// ── Extract a download link from any API response shape ──────────────────────

function pickAudio(result) {
  if (!result) return null;
  return (
    result.download_url ||
    result.audio_url    ||
    result.audio        ||
    result.mp3          ||
    result.url          ||
    result.link         ||
    null
  );
}

// ── Send the track thumbnail / banner ─────────────────────────────────────────

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
    } catch { /* fall through to text */ }
  }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg });
}

// ── Try downloading via multiple endpoints ────────────────────────────────────

async function fetchAudio(videoUrl) {
  const endpoints = [
    // Gifted API — primary endpoints
    () => get("/download/ytmp3",   { url: videoUrl }),
    () => get("/download/ytaudio", { url: videoUrl }),
    () => get("/download/youtube", { url: videoUrl, type: "audio" }),
    // David Cyril API — fallback
    () => davidGet("/download/ytmp3",   { url: videoUrl }),
    () => davidGet("/download/ytaudio", { url: videoUrl }),
  ];

  for (const attempt of endpoints) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;
      const dl     = pickAudio(result);
      if (dl) return { dl, title: result?.title || "" };
    } catch { /* try next */ }
  }

  throw new Error("All audio download sources failed. Try a direct YouTube URL.");
}

// ── .play ─────────────────────────────────────────────────────────────────────

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
      await sendBanner(sock, jid, msg, meta, "Fetching audio… please wait");

      const { dl, title } = await fetchAudio(meta.url);
      const trackTitle    = title || meta.title;

      await sock.sendMessage(jid, {
        audio:    { url: dl },
        mimetype: "audio/mpeg",
        fileName: `${trackTitle}.mp3`,
        ptt:      false,
      }, { quoted: msg });

    } catch (err) {
      console.error("[play]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Audio download failed.\n\n_${err.message}_\n\nTry again or use a direct YouTube URL.`
      }, { quoted: msg });
    }
  },
};
