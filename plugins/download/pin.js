/**
 * KELIN MD — .pinterest command
 * Searches Pinterest by keyword and sends a fetched image.
 * No links needed — just type words!
 */

import { get, searchGet, davidGet } from "../../lib/gifted.js";

// ─── Image search helpers ─────────────────────────────────────────────────────

const IMAGE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    + "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://www.pinterest.com/",
};

function resultItems(data) {
  const containers = [
    data?.results,
    data?.data,
    data?.images,
    data?.result,
    Array.isArray(data) ? data : null,
  ];

  return containers
    .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => Array.isArray(item) ? item : [item]);
}

function imageUrlFrom(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return null;

  const nested =
    item.images?.orig?.url ||
    item.images?.original?.url ||
    item.image?.url ||
    item.image?.src ||
    item.original?.url;

  return nested ||
    item.url ||
    item.image ||
    item.image_url ||
    item.thumbnail ||
    item.src ||
    item.media_url ||
    item.download_url ||
    null;
}

async function searchPinterestImages(query) {
  const attempts = [
    () => searchGet("googleimage", { query: `pinterest ${query}` }),
    () => searchGet("pinterest",   { query }),
    () => get("/search/pinterest", { query }),
    () => searchGet("images",      { query: `${query} pinterest` }),
    () => get("/search/images",    { query: `${query} pinterest` }),
    () => davidGet("/search/pinterest", { query }),
  ];

  const seen = new Set();
  const urls = [];

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      for (const item of resultItems(data)) {
        const url = imageUrlFrom(item);
        if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        urls.push(url);
      }

      const direct = imageUrlFrom(data);
      if (direct && /^https?:\/\//i.test(direct) && !seen.has(direct)) {
        seen.add(direct);
        urls.push(direct);
      }

      if (urls.length >= 8) break;
    } catch { /* try next */ }
  }

  if (!urls.length) throw new Error("No Pinterest results found.");
  return urls.slice(0, 12);
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: IMAGE_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > 15 * 1024 * 1024) throw new Error("image too large");

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 15 * 1024 * 1024) {
      throw new Error("invalid image size");
    }

    const isImage = contentType.startsWith("image/")
      || buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" // PNG
      || buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) // JPEG
      || buffer.subarray(0, 6).toString() === "GIF89a"
      || buffer.subarray(0, 6).toString() === "GIF87a"
      || buffer.subarray(0, 4).toString() === "RIFF"; // WebP
    if (!isImage) throw new Error("not an image");

    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Command ──────────────────────────────────────────────────────────────────

export default {
  name: "pinterest",
  description: "Search Pinterest images by keyword",
  category: "search",
  usage: ".pinterest <keywords>",
  aliases: ["pin", "pinsearch"],
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`📌 *Pinterest Image Search*

Usage: *.pinterest <keywords>*

Examples:
• *.pinterest anime wallpaper*
• *.pinterest sakura art*
• *.pinterest demon slayer*`,
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, {
        text: `🔍 Searching Pinterest for *"${text}"*...`,
      }, { quoted: msg });

      const imageUrls = await searchPinterestImages(text);
      let sent = 0;

      for (const imageUrl of imageUrls) {
        if (sent >= 10) break;
        try {
          const image = await downloadImage(imageUrl);
          await sock.sendMessage(jid, {
            image,
          }, { quoted: msg });
          sent++;
        } catch (error) {
          console.warn(`[pinterest] skipped image: ${error.message}`);
        }
      }

      if (!sent) {
        await sock.sendMessage(jid, {
          text: "❌ Found results but could not load any images.",
        }, { quoted: msg });
      }

    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ ${err.message}`,
      }, { quoted: msg });
    }
  },
};
