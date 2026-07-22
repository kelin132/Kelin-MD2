/**
 * KELIN MD — .instagram command
 * Downloads Instagram posts, reels, and stories.
 * Tries multiple API endpoints with automatic fallback.
 */
import { get, davidGet } from "../../lib/gifted.js";

function pickMedia(result) {
  return (
    result?.download_url ||
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

async function fetchInstagram(url) {
  const attempts = [
    () => get("/download/instagram",    { url }),
    () => davidGet("/download/instagram", { url }),
    () => get("/download/ig",           { url }),
    () => get("/download/reels",        { url }),
  ];

  for (const attempt of attempts) {
    try {
      const data   = await attempt();
      const result = data?.result || data?.data || data;

      // Handle multi-media (carousel / album)
      if (Array.isArray(result?.media) && result.media.length > 0) {
        return { items: result.media, single: null };
      }

      const dl = pickMedia(result);
      if (dl) return { items: null, single: { url: dl, result } };
    } catch { /* try next */ }
  }

  throw new Error("All Instagram download sources failed. Make sure the URL is public.");
}

export default {
  name: "instagram",
  description: "Download Instagram posts, reels, or stories",
  category: "download",
  usage: ".instagram <Instagram URL>",
  aliases: ["ig", "igdl", "reels", "insta"],
  cooldown: 20,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !/instagram\.com|instagr\.am/i.test(url)) {
      return sock.sendMessage(jid, {
        text: "📸 Usage: *.instagram <Instagram post/reel URL>*\n\nExample: .instagram https://www.instagram.com/p/xxxxx"
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { text: "⏳ Downloading Instagram media…" }, { quoted: msg });

      const { items, single } = await fetchInstagram(url);

      if (items) {
        // Carousel — send each item
        for (const item of items.slice(0, 5)) {
          const itemUrl = item?.url || item?.download_url || item;
          if (!itemUrl || typeof itemUrl !== "string") continue;
          if (isVideoUrl(itemUrl, item)) {
            await sock.sendMessage(jid, { video: { url: itemUrl }, mimetype: "video/mp4" }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { image: { url: itemUrl } }, { quoted: msg });
          }
        }
        return;
      }

      // Single media
      const { url: dl, result } = single;
      const caption = `📸 *Instagram Media*\n✨ *KELIN MD*`;

      if (isVideoUrl(dl, result)) {
        await sock.sendMessage(jid, { video: { url: dl }, mimetype: "video/mp4", caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { image: { url: dl }, caption }, { quoted: msg });
      }

    } catch (err) {
      console.error("[instagram]", err.message);
      await sock.sendMessage(jid, {
        text: `❌ Instagram download failed.\n\n_${err.message}_`
      }, { quoted: msg });
    }
  },
};
