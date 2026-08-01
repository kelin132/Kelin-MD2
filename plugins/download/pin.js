/**
 * KELIN MD — .pinterest command
 * Searches Pinterest by keyword and sends a fetched image.
 * No links needed — just type words!
 */

import { get, searchGet, davidGet } from "../../lib/gifted.js";

// ─── Image search helpers ─────────────────────────────────────────────────────

async function searchPinterestImages(query) {
  const attempts = [
    () => searchGet("pinterest",  { query }),
    () => get("/search/pinterest", { query }),
    () => searchGet("images",      { query: `${query} pinterest` }),
    () => get("/search/images",    { query: `${query} pinterest` }),
    () => davidGet("/search/pinterest", { query }),
  ];

  for (const attempt of attempts) {
    try {
      const data = await attempt();
      // Normalise different response shapes
      const results =
        data?.results  ||
        data?.data      ||
        data?.images    ||
        (Array.isArray(data) ? data : null);

      if (Array.isArray(results) && results.length > 0) {
        // Pick a random result for variety
        const pick = results[Math.floor(Math.random() * Math.min(results.length, 10))];
        const url  =
          pick?.url        ||
          pick?.image      ||
          pick?.image_url  ||
          pick?.thumbnail  ||
          pick?.src        ||
          null;
        if (url) return url;
      }

      // Some APIs return a single image URL directly
      const direct =
        data?.url       ||
        data?.image     ||
        data?.image_url ||
        null;
      if (direct) return direct;
    } catch { /* try next */ }
  }

  throw new Error(
    "Couldn't find images for that keyword. Try different words!"
  );
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

      const imageUrl = await searchPinterestImages(text);

      await sock.sendMessage(jid, {
        image:   { url: imageUrl },
        caption: `📌 *${text}*`,
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ ${err.message}`,
      }, { quoted: msg });
    }
  },
};
