/**
 * KELIN MD — .facebook command
 * Downloads Facebook videos using multiple API sources with auto-fallback.
 */
import { get, davidGet } from "../../lib/gifted.js";

// ── Pick the best video URL from an API result ────────────────────────────────

function pickVideo(result) {
  if (!result) return null;
  // Flatten nested result/data objects
  const candidates = [result, result?.result, result?.data, result?.video_data];
  for (const obj of candidates) {
    if (!obj || typeof obj !== "object") continue;
    const url =
      obj.hd           ||
      obj.sd           ||
      obj.hd_url       ||
      obj.sd_url       ||
      obj.download_url ||
      obj.video_url    ||
      obj.video        ||
      obj.url          ||
      obj.link         ||
      obj.downloadUrl  ||
      obj.playUrl      ||
      null;
    if (url && typeof url === "string" && url.startsWith("http")) return url;
  }
  // Deep-search arrays (some APIs return links:[{quality,url}])
  const links = result?.links || result?.result?.links || result?.data?.links || [];
  if (Array.isArray(links) && links.length) {
    const hd = links.find(l => /hd/i.test(l.quality || l.label || ""));
    return (hd || links[0])?.url || null;
  }
  return null;
}

function pickTitle(result) {
  return (
    result?.title ||
    result?.result?.title ||
    result?.data?.title ||
    "Facebook Video"
  );
}

// ── Multi-source fetcher with fallback ────────────────────────────────────────

async function fetchFacebook(url) {
  const attempts = [
    () => get("/download/facebook",  { url }),
    () => get("/download/fb",        { url }),
    () => get("/download/fbvideo",   { url }),
    () => davidGet("/download/facebook", { url }),
    () => davidGet("/download/fb",       { url }),
    () => davidGet("/downloader/facebook", { url }),
    () => get("/download/facebook",  { url, type: "video" }),
    () => get("/social/facebook",    { url }),
    () => get("/download/video",     { url }),
  ];

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const data  = await attempt();
      const video = pickVideo(data);
      if (video) return { video, title: pickTitle(data) };
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(
    lastErr?.message?.includes("HTTP")
      ? "The video download API is currently unavailable. Please try again later."
      : "Could not extract the video. Make sure it is *Public* and the URL is correct."
  );
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default {
  name: "facebook",
  description: "Download Facebook videos",
  category: "download",
  usage: ".facebook <Facebook video URL>",
  aliases: ["fb", "fbdl", "fbvid"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`📥 *Facebook Video Downloader*

Usage: *.facebook <Facebook video URL>*

Supported formats:
• https://www.facebook.com/watch?v=xxxx
• https://fb.watch/xxxxx
• https://www.facebook.com/reel/xxxx
• https://www.facebook.com/share/v/xxxx`,
      }, { quoted: msg });
    }

    if (!/facebook\.com|fb\.watch/i.test(text)) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide a valid Facebook video URL.\n\nExamples:\n• https://www.facebook.com/watch?v=xxxx\n• https://fb.watch/xxxxx\n• https://www.facebook.com/reel/xxxx",
      }, { quoted: msg });
    }

    const status = await sock.sendMessage(jid, { text: "⏳ Fetching Facebook video..." }, { quoted: msg });

    try {
      const { video, title } = await fetchFacebook(text.trim());

      await sock.sendMessage(jid, {
        video:    { url: video },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        caption:  `🎬 *${title}*\n\n✨ *KELIN MD*`,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text:
`❌ *Failed to download*

${err.message}

💡 Tips:
• Make sure the video is set to *Public*
• Copy the full URL directly from the browser
• Reels and Watch videos both work`,
      }, { quoted: msg });
    }
  },
};
