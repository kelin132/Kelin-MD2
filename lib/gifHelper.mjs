/**
 * KELIN MD — Image / GIF helper (v2)
 *
 * Priority order for images:
 *   1. Dattebayo API character art (real wiki PNGs)
 *   2. Giphy API search (if GIPHY_API_KEY is set)
 *   3. Curated static Naruto fallback images
 */

import { createRequire } from "module";
import { NARUTO_IMAGES, getClanImage, getCharacterImage, getEnemyImage } from "./narutoAPI.mjs";

const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const GIPHY_KEY  = process.env.GIPHY_API_KEY || _settings.giphyApiKey || "";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs/search";
const CACHE_TTL  = 60 * 60 * 1000; // 1 hour
const LIMIT      = 20;

/** @type {Map<string, { urls: string[], fetchedAt: number }>} */
const _giphyCache = new Map();

// ── Curated Naruto-specific fallback GIFs ─────────────────────────────────────
// These are stable Giphy CDN links for specific Naruto scenes.
const NARUTO_GIFS = {
  // Naruto running/starting journey
  "start":      "https://media.giphy.com/media/xT9DPIlGnuHpr2yymU/giphy.gif",
  // Naruto profile / thumbs up
  "profile":    "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
  // Battle / fight
  "battle":     "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
  // Victory / win
  "victory":    "https://media.giphy.com/media/Q4FEHa9eWFtHHMzgKa/giphy.gif",
  // Defeat / sad
  "defeat":     "https://media.giphy.com/media/hG9TLJmFOtKHfuAl2e/giphy.gif",
  // Mission / running
  "mission":    "https://media.giphy.com/media/l0HlAgJTSoRBMqGgE/giphy.gif",
  // Jutsu / chakra / hand seals
  "jutsu":      "https://media.giphy.com/media/skVe8kyj61sqS0RlSZ/giphy.gif",
  // Training
  "train":      "https://media.giphy.com/media/WoFRDxTnxQKpq/giphy.gif",
  // Rank up / power
  "rank":       "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  // Hunt / tracking
  "hunt":       "https://media.giphy.com/media/yRYlmHTF1qJnu5bdeH/giphy.gif",
  // Shop / buying
  "shop":       "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  // Inventory / items
  "inventory":  "https://media.giphy.com/media/l0HlAgJTSoRBMqGgE/giphy.gif",
  // Leaderboard / top ninjas
  "leaderboard":"https://media.giphy.com/media/Q4FEHa9eWFtHHMzgKa/giphy.gif",
  // Character lookup
  "character":  "https://media.giphy.com/media/xT9DPIlGnuHpr2yymU/giphy.gif",
  // Default
  "default":    "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
};

function pickFallbackGif(term) {
  const lower = (term || "").toLowerCase();
  for (const [key, url] of Object.entries(NARUTO_GIFS)) {
    if (lower.includes(key)) return url;
  }
  return NARUTO_GIFS.default;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Attempt to fetch a GIF from Giphy. Returns null on failure.
 */
async function fetchGiphy(searchTerm) {
  if (!GIPHY_KEY) return null;
  const cached = _giphyCache.get(searchTerm);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return pick(cached.urls);
  try {
    const url  = `${GIPHY_BASE}?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${LIMIT}&rating=pg-13`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const urls = (json.data || [])
      .map(g => g?.images?.downsized?.url || g?.images?.original?.url)
      .filter(Boolean);
    if (!urls.length) return null;
    _giphyCache.set(searchTerm, { urls, fetchedAt: Date.now() });
    return pick(urls);
  } catch {
    return null;
  }
}

/**
 * Return a GIF URL for the given search term.
 * Tries Giphy first (if key is configured), falls back to curated Naruto GIFs.
 */
export async function getGif(searchTerm) {
  const giphy = await fetchGiphy(searchTerm);
  return giphy ?? pickFallbackGif(searchTerm);
}

// ── Naruto-image-aware send helpers ──────────────────────────────────────────

/**
 * Send a text caption with an image.
 * `imageUrl` must be a direct URL string.
 */
async function sendImage(sock, jid, msg, caption, imageUrl) {
  try {
    return await sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
  } catch {
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  }
}

/**
 * Original API-compatible helper: send a message with a Giphy / fallback GIF.
 * Unchanged signature so existing callers keep working.
 */
export async function sendWithGif(sock, jid, msg, caption, gifTerm) {
  const imgUrl = await getGif(gifTerm);
  return sendImage(sock, jid, msg, caption, imgUrl);
}

// ── Naruto-smart image senders ────────────────────────────────────────────────

/**
 * Send with a real Naruto character image fetched from the Dattebayo API,
 * using the player's clan name to pick the right character art.
 *
 * Falls back to the curated static PNG for that theme key.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {object} msg
 * @param {string} caption
 * @param {string} clanName   - e.g. "Uchiha", "Hyuga"
 * @param {string} fallbackKey - key into NARUTO_IMAGES (default "profile")
 */
export async function sendWithClanImage(sock, jid, msg, caption, clanName, fallbackKey = "profile") {
  let imgUrl;
  try {
    imgUrl = await getClanImage(clanName, fallbackKey);
  } catch {
    imgUrl = NARUTO_IMAGES[fallbackKey] ?? NARUTO_IMAGES.profile;
  }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a real character image by character name.
 */
export async function sendWithCharacterImage(sock, jid, msg, caption, characterName, fallbackKey = "profile") {
  let imgUrl;
  try {
    imgUrl = await getCharacterImage(characterName, fallbackKey);
  } catch {
    imgUrl = NARUTO_IMAGES[fallbackKey] ?? NARUTO_IMAGES.profile;
  }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a villain/enemy image based on the enemy's name.
 */
export async function sendWithEnemyImage(sock, jid, msg, caption, enemyName) {
  let imgUrl;
  try {
    imgUrl = await getEnemyImage(enemyName);
  } catch {
    imgUrl = NARUTO_IMAGES.enemy;
  }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a themed static Naruto image (no API call, instant).
 * Use for commands where speed matters more than the perfect image.
 *
 * @param {string} themeKey - one of: profile, battle, victory, defeat, mission,
 *                            jutsu, train, rank, shop, leaderboard, inventory, start, enemy
 */
export async function sendWithNarutoTheme(sock, jid, msg, caption, themeKey) {
  const imgUrl = NARUTO_IMAGES[themeKey] ?? NARUTO_IMAGES.profile;
  return sendImage(sock, jid, msg, caption, imgUrl);
}
