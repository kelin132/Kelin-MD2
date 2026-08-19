/**
 * KELIN MD — .play command
 * Searches YouTube and downloads audio.
 * Tries multiple API endpoints with automatic fallback.
 */
import yts from "yt-search";
import { get, davidGet } from "../../lib/gifted.js";
import { downloadMediaBuffer, omegaDownload } from "../../lib/omegaDownload.js";
import { princeMedia, PRINCE_ENDPOINTS } from "../../lib/princeTech.mjs";

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

// ── Valore AIO fallback ─────────────────────────────────────────────────────────

async function valoreAudio(videoUrl) {
  const response = await fetch("https://dl.valore.web.id/api/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": `kelin-play-${Date.now()}`,
      Accept: "application/json",
    },
    body: JSON.stringify({ url: videoUrl }),
    signal: AbortSignal.timeout(45_000),
  });

  const raw = await response.text();
  let payload;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Valore returned a non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || payload?.error || `Valore request failed (HTTP ${response.status})`);
  }

  const medias = Array.isArray(payload?.data?.medias) ? payload.data.medias : [];
  const audio = medias
    .filter((media) => media?.audioAvailable !== false && /^audio$/i.test(String(media.type || "")) && /mp3|m4a|audio/i.test(String(media.format || "")) && /^https?:\/\//i.test(media.url || ""))
    .sort((a, b) => Number(b.size || 0) - Number(a.size || 0))[0];

  if (!audio) throw new Error("Valore returned no usable MP3 stream");
  return { dl: audio.url, title: payload?.data?.title || "YouTube Audio" };
}

// ── Try downloading via multiple endpoints ────────────────────────────────────

export async function fetchAudio(videoUrl, searchTitle = "") {
  const endpoints = [
    // Gifted API — primary endpoints
    () => get("/download/ytmp3",   { url: videoUrl }),
    () => get("/download/ytaudio", { url: videoUrl }),
    () => get("/download/youtube", { url: videoUrl, type: "audio" }),
    // David Cyril API — fallback
    () => davidGet("/download/ytmp3",   { url: videoUrl }),
    () => davidGet("/download/ytaudio", { url: videoUrl }),
    // OmegaTech documented fallback. Its `/play` route expects a search
    // query, not a YouTube URL; use the resolved title first and retain the
    // URL as a secondary attempt for providers that accept URLs.
    () => omegaDownload("play", { query: searchTitle || videoUrl, format: "mp3", quality: "128k" }),
    () => omegaDownload("play", { query: videoUrl, format: "mp3", quality: "128k" }),
    // Exact Prince Tech MP3 endpoint supplied for `.play`.
    // It is tried before other emergency sources and is accepted only when it
    // returns a real URL or direct audio buffer; quality-only metadata is not media.
    async () => {
      const result = await princeMedia(PRINCE_ENDPOINTS.play, { url: videoUrl, format: "mp3" });
      return result.buffer
        ? { buffer: result.buffer, mimetype: result.mimetype, title: "" }
        : { dl: result.url, title: "" };
    },
    // Valore AIO fallback; select a real MP3 stream from its media list.
    () => valoreAudio(videoUrl),
  ];

  let lastError;
  for (const attempt of endpoints) {
    try {
      const data = await attempt();
      if (data?.buffer) {
        const mimetype = String(data.mimetype || "").toLowerCase();
        if (mimetype && !mimetype.startsWith("audio/")) {
          lastError = new Error("Provider returned non-audio media");
          continue;
        }
        return { ...data, mimetype: mimetype || "audio/mpeg" };
      }
      const result = data?.result || data?.data || data;
      const dl = data?.dl || pickAudio(result);
      if (!dl) {
        lastError = new Error("Provider returned no audio URL");
        continue;
      }
      try {
        const file = await downloadMediaBuffer(dl);
        if (file.mimetype && !file.mimetype.startsWith("audio/") && !/\.(mp3|m4a|aac|ogg|wav)(?:\?|$)/i.test(dl)) {
          throw new Error("Provider returned non-audio media");
        }
        return { buffer: file.buffer, mimetype: file.mimetype || "audio/mpeg", title: result?.title || data?.title || "" };
      } catch (mediaError) {
        lastError = mediaError;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`All audio download sources failed. ${lastError?.message || "No provider returned usable audio."}`);
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

      const { dl, buffer, mimetype: returnedMimetype, title } = await fetchAudio(meta.url, meta.title);
      const trackTitle = title || meta.title;
      const file = buffer ? { buffer, mimetype: returnedMimetype || "audio/mpeg" } : await downloadMediaBuffer(dl);
      const mimetype = file.mimetype.startsWith("audio/") ? file.mimetype : "audio/mpeg";

      await sock.sendMessage(jid, {
        audio: file.buffer,
        mimetype,
        fileName: `${trackTitle}.mp3`,
        ptt: false,
      }, { quoted: msg });

    } catch (err) {
      console.error("[play]", err.message);
      await sock.sendMessage(jid, {
        text: "❌ This audio couldn't be downloaded. Try again later!"
      }, { quoted: msg });
    }
  },
};
