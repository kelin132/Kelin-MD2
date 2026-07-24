/**
 * KELIN MD — .instagram command
 * Downloads Instagram posts, reels, stories, and carousels.
 * Tries multiple API endpoints with automatic fallback.
 */
import { get, davidGet } from "../../lib/gifted.js";

// ── Pick best media URL from API result ───────────────────────────────────────

function pickMedia(result) {
  return (
    result?.download_url ||
    result?.video_url    ||
    result?.image_url    ||
    result?.url          ||
    result?.video        ||
    result?.image        ||
    result?.media        ||
    null
  );
}

function isVideoUrl(url, result) {
  return (
    result?.type === "video"      ||
    /\.mp4(\?|$)/i.test(url)     ||
    /reel|video/i.test(result?.type || "")
  );
}

// ── Multi-source fetcher with fallback ────────────────────────────────────────

async function fetchInstagram(url) {
  const attempts = [
    () => get("/download/instagram",      { url }),
    () => get("/download/ig",             { url }),
    () => get("/download/reels",          { url }),
    () => davidGet("/download/instagram", { url }),
    () => davidGet("/download/ig",        { url }),
    () => davidGet("/download/reels",     { url }),
    () => get("/download/instagram",      { url, type: "video" }),
    () => get("/social/instagram",        { url }),
  ];

  for (const attempt of attempts) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;

      // Handle carousel / album — array of items
      if (Array.isArray(result?.media) && result.media.length > 0) {
        return { items: result.media, single: null };
      }
      if (Array.isArray(result?.items) && result.items.length > 0) {
        return { items: result.items, single: null };
      }
      if (Array.isArray(result) && result.length > 0) {
        return { items: result, single: null };
      }

      const dl = pickMedia(result);
      if (dl) return { items: null, single: { url: dl, result } };
    } catch { /* try next */ }
  }

  throw new Error("All Instagram download sources failed. Make sure the post/reel is public.");
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default {
  name: "instagram",
  description: "Download Instagram posts, reels, stories, and carousels",
  category: "download",
  usage: ".instagram <Instagram URL>",
  aliases: ["ig", "igdl", "reels", "insta", "reel"],
  cooldown: 20,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !/instagram\.com|instagr\.am/i.test(url)) {
      return sock.sendMessage(jid, {
        text: "📸 *Instagram Downloader*\n\nUsage:\n*.instagram <Instagram URL>*\n\nSupported:\n• Posts: https://www.instagram.com/p/xxxx\n• Reels: https://www.instagram.com/reel/xxxx\n• Stories: https://www.instagram.com/stories/xxxx",
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading Instagram media..." }, { quoted: msg });

      const { items, single } = await fetchInstagram(url.trim());

      const caption = `📸 *Instagram Media*\n✨ *KELIN MD*`;

      if (items) {
        // Carousel — send up to 5 items
        let sent = 0;
        for (const item of items.slice(0, 5)) {
          const itemUrl = item?.url || item?.download_url || item?.video_url || item?.image_url;
          if (!itemUrl || typeof itemUrl !== "string") continue;

          try {
            if (isVideoUrl(itemUrl, item)) {
              await sock.sendMessage(jid, {
                video:    { url: itemUrl },
                mimetype: "video/mp4",
                caption:  sent === 0 ? caption : undefined,
              }, { quoted: msg });
            } else {
              await sock.sendMessage(jid, {
                image:   { url: itemUrl },
                caption: sent === 0 ? caption : undefined,
              }, { quoted: msg });
            }
            sent++;
          } catch { /* skip failed item */ }
        }
        if (sent === 0) throw new Error("Could not retrieve any media from this carousel.");
        return;
      }

      // Single media item
      const { url: dl, result } = single;

      if (isVideoUrl(dl, result)) {
        await sock.sendMessage(jid, {
          video:    { url: dl },
          mimetype: "video/mp4",
          caption,
        }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, {
          image: { url: dl },
          caption,
        }, { quoted: msg });
      }

    } catch (err) {
      console.error("[instagram]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Instagram download failed.\n\n_${err.message}_\n\n💡 Make sure:\n• The post/reel is set to *Public*\n• The URL is correct\n• Try copying the link directly from Instagram`,
      }, { quoted: msg });
    }
  },
};
