/**
 * KELIN MD — .tiktok command
 * Downloads TikTok videos without watermark via the David Cyril API.
 * API: https://apis.davidcyril.name.ng/endpoints/download/#tiktok-downloader
 */
import { davidGet } from "../../lib/gifted.js";
import { downloadMediaBuffer, omegaDownload } from "../../lib/omegaDownload.js";

// Deduplicate rapid re-triggers
const processed = new Set();

const DAVID_BASE = "https://apis.davidcyril.name.ng";

/**
 * Fetch TikTok download data from David Cyril API.
 * Tries multiple known endpoint patterns with automatic fallback.
 */
async function fetchTikTok(url) {
  const attempts = [
    // OmegaTech all-downloader
    () => omegaDownload("all", { url }),
    () => davidGet("/download/tiktok",    { url }),
    () => davidGet("/download/tiktokdl",  { url }),
    () => davidGet("/download/tt",        { url }),
    () => davidGet("/tiktok",             { url }),
  ];

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      // API can nest result under .result, .data, or be flat
      const r = data?.result ?? data?.data ?? data;
      if (!r) continue;

      const dl =
        r.download_url ?? r.video_url ?? r.video ?? r.nowm ??
        r.url          ?? r.mp4       ?? r.play  ?? null;

      const title = r.title ?? r.desc ?? r.description ?? "TikTok Video";

      if (dl && typeof dl === "string") return { dl, title };
    } catch { /* try next */ }
  }

  throw new Error("All TikTok download sources failed. Make sure the URL is valid and the video is public.");
}

export default {
  name: "tiktok",
  description: "Download TikTok video without watermark",
  category: "download",
  usage: ".tiktok <TikTok URL>",
  aliases: ["tt", "tikdl", "tiktokdl"],
  cooldown: 20,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // De-dupe rapid re-triggers
    if (processed.has(msg.key.id)) return;
    processed.add(msg.key.id);
    setTimeout(() => processed.delete(msg.key.id), 5 * 60 * 1000);

    const url = args[0];

    if (!url || !/tiktok\.com|vm\.tiktok|vt\.tiktok/i.test(url)) {
      return sock.sendMessage(jid, {
        text: "🎵 *TikTok Downloader*\n\nUsage: *.tiktok <TikTok URL>*\n\nExample:\n.tiktok https://vm.tiktok.com/xxxxx\n.tiktok https://www.tiktok.com/@user/video/xxxxx",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading TikTok video, please wait..." }, { quoted: msg });

      const { dl, title } = await fetchTikTok(url.trim());
      const file = await downloadMediaBuffer(dl);
      const mimetype = file.mimetype.startsWith("video/") ? file.mimetype : "video/mp4";

      await sock.sendMessage(jid, {
        video: file.buffer,
        mimetype,
        caption: `🎵 *${title}*`,
      }, { quoted: msg });

    } catch (err) {
      console.error("[tiktok]", err?.stack || err?.message || err);
      await sock.sendMessage(jid, {
        text: "❌ This video couldn't be downloaded. Try again later!",
      }, { quoted: msg });
    }
  },
};
