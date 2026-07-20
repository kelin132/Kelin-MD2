/**
 * KELIN MD — Giphy helper
 * Fetches a random GIF URL for a given search term.
 * Results are cached per search term for 1 hour so the API
 * isn't hit on every single command.
 *
 * Usage:
 *   import { getGif } from "../../lib/gifHelper.mjs";
 *   const url = await getGif("naruto battle");
 *   // url is a string or null on failure
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname } from "path";

const _require = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const API_KEY   = process.env.GIPHY_API_KEY || _settings.giphyApiKey || "";
const API_BASE  = "https://api.giphy.com/v1/gifs/search";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const LIMIT     = 20;              // pool to pick from

/** @type {Map<string, { urls: string[], fetchedAt: number }>} */
const _cache = new Map();

/**
 * Fallback GIF URLs used when Giphy is unreachable.
 * Keyed by a loose keyword match.
 */
const FALLBACKS = {
  "battle":    "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
  "train":     "https://media.giphy.com/media/WoFRDxTnxQKpq/giphy.gif",
  "mission":   "https://media.giphy.com/media/l0HlAgJTSoRBMqGgE/giphy.gif",
  "rank":      "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  "jutsu":     "https://media.giphy.com/media/skVe8kyj61sqS0RlSZ/giphy.gif",
  "hunt":      "https://media.giphy.com/media/yRYlmHTF1qJnu5bdeH/giphy.gif",
  "profile":   "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
  "default":   "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
};

function pickFallback(term) {
  const lower = term.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACKS)) {
    if (lower.includes(key)) return url;
  }
  return FALLBACKS.default;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Return a random Giphy GIF URL for `searchTerm`.
 * Returns null only if both the API and fallbacks fail.
 */
export async function getGif(searchTerm) {
  if (!API_KEY) return pickFallback(searchTerm);

  const cached = _cache.get(searchTerm);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return pick(cached.urls);
  }

  try {
    const url  = `${API_BASE}?api_key=${API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${LIMIT}&rating=pg-13`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`Giphy HTTP ${res.status}`);
    const json = await res.json();
    const urls = (json.data || [])
      .map(g => g?.images?.downsized?.url || g?.images?.original?.url)
      .filter(Boolean);

    if (!urls.length) return pickFallback(searchTerm);

    _cache.set(searchTerm, { urls, fetchedAt: Date.now() });
    return pick(urls);
  } catch {
    return pickFallback(searchTerm);
  }
}

/**
 * Convenience: send a message with an image caption.
 * Falls back to plain text if the image URL can't be fetched.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {object} msg     - original message (for quoting)
 * @param {string} caption - the text body
 * @param {string} gifTerm - Giphy search term
 */
export async function sendWithGif(sock, jid, msg, caption, gifTerm) {
  try {
    const imgUrl = await getGif(gifTerm);
    if (imgUrl) {
      return await sock.sendMessage(jid, { image: { url: imgUrl }, caption }, { quoted: msg });
    }
  } catch { /* fall through */ }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg });
}
