/**
 * KELIN MD — .ytdl command
 * Downloads YouTube videos using GiftedTech API with David Cyril fallback.
 */
import yts from "yt-search";
import { get, davidGet } from "../../lib/gifted.js";

// ── Search YouTube ────────────────────────────────────────────────────────────

async function ytSearch(input) {
  if (/youtube\.com|youtu\.be/i.test(input)) {
    return { url: input, title: input, thumbnail: null, duration: "", author: "" };
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
  };
}

// ── Extract video download URL ────────────────────────────────────────────────

function pickVideo(result) {
  if (!result) return null;
  return (
    result.download_url ||
    result.video_url    ||
    result.video        ||
    result.hd           ||
    result.sd           ||
    result.url          ||
    result.link         ||
    null
  );
}

async function fetchVideo(videoUrl) {
  const endpoints = [
    () => get("/download/ytdl",    { url: videoUrl }),
    () => get("/download/youtube", { url: videoUrl, type: "video" }),
    () => get("/download/yt",      { url: videoUrl }),
    () => davidGet("/download/ytdl",    { url: videoUrl }),
    () => davidGet("/download/youtube", { url: videoUrl, type: "video" }),
    () => davidGet("/download/yt",      { url: videoUrl }),
  ];

  for (const attempt of endpoints) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;
      const dl     = pickVideo(result);
      if (dl) return { dl, title: result?.title || "" };
    } catch { /* try next */ }
  }

  throw new Error("All YouTube video download sources failed. Try a direct YouTube URL or use *.play* for audio.");
}

// ── .ytdl ─────────────────────────────────────────────────────────────────────

export default {
  name: "ytdl",
  description: "Download YouTube videos (MP4)",
  category: "download",
  usage: ".ytdl <YouTube URL or search query>",
  aliases: ["yt", "youtube", "ytvid"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🎬 *YouTube Video Downloader*\n\nUsage:\n*.ytdl <YouTube URL or search query>*\n\nExample:\n.ytdl https://youtu.be/xxxxx\n.ytdl Naruto opening 1\n\n💡 For audio only, use *.play*",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "🔍 Searching YouTube..." }, { quoted: msg });

      const meta = await ytSearch(text);

      // Send preview while fetching
      const previewCaption = [
        `🎬 *${meta.title}*`,
        meta.author   ? `👤 ${meta.author}`   : "",
        meta.duration ? `⏱️ ${meta.duration}` : "",
        "",
        "⬇️ _Downloading video… please wait_",
      ].filter(Boolean).join("\n");

      if (meta.thumbnail) {
        try {
          await sock.sendMessage(jid, {
            image:   { url: meta.thumbnail },
            caption: previewCaption,
          }, { quoted: msg });
        } catch {
          await sock.sendMessage(jid, { text: previewCaption }, { quoted: msg });
        }
      } else {
        await sock.sendMessage(jid, { text: previewCaption }, { quoted: msg });
      }

      const { dl, title } = await fetchVideo(meta.url);
      const trackTitle    = title || meta.title;

      await sock.sendMessage(jid, {
        video:    { url: dl },
        mimetype: "video/mp4",
        fileName: `${trackTitle}.mp4`,
        caption:  `🎬 *${trackTitle}*\n\n✨ *KELIN MD*`,
      }, { quoted: msg });

    } catch (err) {
      console.error("[ytdl]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ YouTube download failed.\n\n_${err.message}_\n\nTip: Try a direct YouTube link, or use *.play* for audio.`,
      }, { quoted: msg });
    }
  },
};
