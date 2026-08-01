/**
 * KELIN MD — Image / GIF helper (v2)
 *
 * Priority order for images:
 *   1. Dattebayo API character art (real wiki PNGs) — via narutoAPI.mjs
 *   2. Giphy API search (if GIPHY_API_KEY is set)
 *   3. Curated static Naruto fallback images
 *
 * narutoAPI.mjs is loaded lazily so that any failure there does NOT
 * break this module — gifHelper will still export everything and fall
 * back gracefully to the static images below.
 */

import { createRequire } from "module";

const _require  = createRequire(import.meta.url);
const _settings = _require("../settings.cjs");

const GIPHY_KEY  = process.env.GIPHY_API_KEY || _settings.giphyApiKey || "";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs/search";
const CACHE_TTL  = 60 * 60 * 1000; // 1 hour
const LIMIT      = 20;

/** @type {Map<string, { urls: string[], fetchedAt: number }>} */
const _giphyCache = new Map();

// ── Curated static Naruto wiki image fallbacks ────────────────────────────────
const NARUTO_IMAGES = {
  profile:      "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
  battle:       "https://static.wikia.nocookie.net/naruto/images/2/21/Sasuke_Part_1.png",
  victory:      "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
  defeat:       "https://static.wikia.nocookie.net/naruto/images/1/13/Sasuke_Part_2.png",
  mission:      "https://static.wikia.nocookie.net/naruto/images/1/17/Kakashi_Hatake.png",
  jutsu:        "https://static.wikia.nocookie.net/naruto/images/3/3f/Rasengan_PB.png",
  train:        "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
  rank:         "https://static.wikia.nocookie.net/naruto/images/1/17/Kakashi_Hatake.png",
  shop:         "https://static.wikia.nocookie.net/naruto/images/9/9a/Tsunade.png",
  leaderboard:  "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
  inventory:    "https://static.wikia.nocookie.net/naruto/images/9/9a/Tsunade.png",
  start:        "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
  enemy:        "https://static.wikia.nocookie.net/naruto/images/7/71/Pain_Tendo.png",
  default:      "https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_I.png",
};

// ── Curated Naruto-specific fallback GIFs ─────────────────────────────────────
const NARUTO_GIFS = {
  start:        "https://media.giphy.com/media/xT9DPIlGnuHpr2yymU/giphy.gif",
  profile:      "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
  battle:       "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
  victory:      "https://media.giphy.com/media/Q4FEHa9eWFtHHMzgKa/giphy.gif",
  defeat:       "https://media.giphy.com/media/hG9TLJmFOtKHfuAl2e/giphy.gif",
  mission:      "https://media.giphy.com/media/l0HlAgJTSoRBMqGgE/giphy.gif",
  jutsu:        "https://media.giphy.com/media/skVe8kyj61sqS0RlSZ/giphy.gif",
  train:        "https://media.giphy.com/media/WoFRDxTnxQKpq/giphy.gif",
  rank:         "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  hunt:         "https://media.giphy.com/media/yRYlmHTF1qJnu5bdeH/giphy.gif",
  shop:         "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  inventory:    "https://media.giphy.com/media/l0HlAgJTSoRBMqGgE/giphy.gif",
  leaderboard:  "https://media.giphy.com/media/Q4FEHa9eWFtHHMzgKa/giphy.gif",
  character:    "https://media.giphy.com/media/xT9DPIlGnuHpr2yymU/giphy.gif",
  default:      "https://media.giphy.com/media/A8UFISckEbokw/giphy.gif",
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

// ── Lazy narutoAPI loader ─────────────────────────────────────────────────────
let _narutoAPI = null;

async function getNarutoAPI() {
  if (_narutoAPI) return _narutoAPI;
  try {
    _narutoAPI = await import("./narutoAPI.mjs");
    return _narutoAPI;
  } catch {
    return null; // silently fall back — gifHelper still works without it
  }
}

// ── Giphy helper ─────────────────────────────────────────────────────────────

async function fetchGiphy(searchTerm) {
  if (!GIPHY_KEY) return null;
  const cached = _giphyCache.get(searchTerm);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return pick(cached.urls);
  try {
    const url  = `${GIPHY_BASE}?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${LIMIT}&rating=pg-13`;
    const res  = await fetch(url);
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

// ── Core send helper ──────────────────────────────────────────────────────────

async function sendImage(sock, jid, msg, caption, imageUrl) {
  try {
    return await sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
  } catch {
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  }
}

// ── Original-compatible helper (unchanged signature) ─────────────────────────

/**
 * Send a message with a Giphy / curated Naruto GIF.
 * Backward-compatible with all existing callers.
 */
export async function sendWithGif(sock, jid, msg, caption, gifTerm) {
  const imgUrl = await getGif(gifTerm);
  return sendImage(sock, jid, msg, caption, imgUrl);
}

// ── Naruto-smart image senders (use real API art, fall back gracefully) ───────

/**
 * Send with a real character image based on the player's clan name.
 * Falls back to the static wiki PNG for that theme.
 */
export async function sendWithClanImage(sock, jid, msg, caption, clanName, fallbackKey = "profile") {
  let imgUrl = NARUTO_IMAGES[fallbackKey] || NARUTO_IMAGES.profile;
  try {
    const api = await getNarutoAPI();
    if (api) imgUrl = await api.getClanImage(clanName, fallbackKey);
  } catch { /* use fallback */ }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a real character image by character name.
 */
export async function sendWithCharacterImage(sock, jid, msg, caption, characterName, fallbackKey = "profile") {
  let imgUrl = NARUTO_IMAGES[fallbackKey] || NARUTO_IMAGES.profile;
  try {
    const api = await getNarutoAPI();
    if (api) imgUrl = await api.getCharacterImage(characterName, fallbackKey);
  } catch { /* use fallback */ }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a villain/enemy image based on the enemy's name.
 */
export async function sendWithEnemyImage(sock, jid, msg, caption, enemyName) {
  let imgUrl = NARUTO_IMAGES.enemy;
  try {
    const api = await getNarutoAPI();
    if (api) imgUrl = await api.getEnemyImage(enemyName);
  } catch { /* use fallback */ }
  return sendImage(sock, jid, msg, caption, imgUrl);
}

/**
 * Send with a themed static Naruto image — no API call, instant.
 * @param {string} themeKey — profile | battle | victory | defeat | mission |
 *                            jutsu | train | rank | shop | leaderboard | inventory | start | enemy
 */
export async function sendWithNarutoTheme(sock, jid, msg, caption, themeKey) {
  const imgUrl = NARUTO_IMAGES[themeKey] || NARUTO_IMAGES.default;
  return sendImage(sock, jid, msg, caption, imgUrl);
}
