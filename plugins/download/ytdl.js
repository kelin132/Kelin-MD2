/**
 * KELIN MD — .ytdl command
 * Downloads YouTube videos using GiftedTech API with David Cyril fallback.
 */
import yts from "yt-search";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { get, davidGet } from "../../lib/gifted.js";

const execFileAsync = promisify(execFile);

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
    result.video_url    ||
    result.download_url ||
    result.sd           ||
    result.video        ||
    result.url          ||
    result.link         ||
    null
  );
}

async function fetchVideo(videoUrl) {
  const endpoints = [
    // The APIs may ignore quality parameters, so the downloaded file is
    // normalized to 360p locally before it is sent to WhatsApp.
    () => get("/download/ytdl",    { url: videoUrl, quality: "360p", format: "mp4" }),
    () => get("/download/youtube", { url: videoUrl, type: "video", quality: "360p", format: "mp4" }),
    () => get("/download/yt",      { url: videoUrl, quality: "360p", format: "mp4" }),
    () => davidGet("/download/ytdl",    { url: videoUrl, quality: "360p", format: "mp4" }),
    () => davidGet("/download/youtube", { url: videoUrl, type: "video", quality: "360p", format: "mp4" }),
    () => davidGet("/download/yt",      { url: videoUrl, quality: "360p", format: "mp4" }),
  ];

  for (const attempt of endpoints) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;
      const dl     = pickVideo(result);
      if (dl) return { dl, title: result?.title || "", quality: result?.video_quality || "standard" };
    } catch { /* try next */ }
  }

  throw new Error("The YouTube video could not be prepared. Try a direct YouTube URL or use *.play* for audio.");
}

async function downloadAndConvertVideo(url) {
  const stamp = `${Date.now()}_${process.pid}`;
  const sourcePath = join(tmpdir(), `kelin_ytdl_${stamp}.source`);
  const outputPath = join(tmpdir(), `kelin_ytdl_${stamp}.mp4`);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(90_000),
      headers: { "User-Agent": "Mozilla/5.0 (KELIN-MD downloader)" },
    });
    if (!response.ok) throw new Error(`media server returned HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const source = Buffer.from(await response.arrayBuffer());
    if (!source.length) throw new Error("the media server returned an empty file");
    if (/text\/html|application\/json/i.test(contentType) || source.subarray(0, 100).toString().includes("Video unavailable")) {
      throw new Error("the media URL expired or the video is unavailable");
    }
    await writeFile(sourcePath, source);

    // Always send a local, WhatsApp-friendly MP4. This prevents the
    // "media not available" error caused by expiring provider URLs and keeps
    // the command below HD by limiting the output to 360p.
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", sourcePath,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-vf", "scale=-2:360:force_original_aspect_ratio=decrease",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "27",
      "-maxrate", "700k",
      "-bufsize", "1400k",
      "-pix_fmt", "yuv420p",
      "-profile:v", "main",
      "-level", "3.1",
      "-c:a", "aac",
      "-b:a", "96k",
      "-ar", "44100",
      "-movflags", "+faststart",
      outputPath,
    ], { timeout: 150_000 });

    const converted = await readFile(outputPath);
    if (!converted.length) throw new Error("the converted MP4 was empty");
    return converted;
  } catch (error) {
    throw new Error(`could not create a compatible video: ${error.message}`);
  } finally {
    await Promise.allSettled([
      unlink(sourcePath),
      unlink(outputPath),
    ]);
  }
}

// ── .ytdl ─────────────────────────────────────────────────────────────────────

export default {
  name: "yt",
  description: "Download YouTube videos (MP4)",
  category: "download",
  usage: ".ytdl <YouTube URL or search query>",
  aliases: ["yt", "youtube", "video"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🎬 *YouTube Video Downloader*\n\nUsage:\n*.ytdl <YouTube URL or search query>*\n\nExample:\n.ytdl https://youtu.be/xxxxx\n.ytdl Naruto opening 1\n\n📱 Videos are converted to WhatsApp-friendly 360p.\n💡 For audio only, use *.play*",
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
         "⬇️ _Downloading standard-quality video… please wait_",
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
      const videoBuffer = await downloadAndConvertVideo(dl);

      await sock.sendMessage(jid, {
        video:    videoBuffer,
        mimetype: "video/mp4",
        fileName: "kelin-youtube-360p.mp4",
        caption:  `🎬 *${trackTitle}*\n\n✨ *KELIN MD*`,
      }, { quoted: msg });

    } catch (err) {
      console.error("[ytdl]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ YouTube download failed.\n\n_${err.message}_\n\nTip: Try a public direct YouTube link, or use *.play* for audio.`,
      }, { quoted: msg });
    }
  },
};
