/**
 * KELIN MD — Card API helper
 * Fetches cards from https://cardapi.eclipse.name.ng/api/cards?tier=N
 * Caches all tiers in memory for 1 hour to avoid hammering the API.
 *
 * API response shape: { success, count, data: [{ tier, title, url, series }] }
 * Tier numbers: 1=Common  2=Uncommon  3=Rare  4=Epic  5=Legendary
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const API_BASE = "https://cardapi.eclipse.name.ng/api/cards";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const execFileAsync = promisify(execFile);
const MEDIA_CACHE_DIR = join(tmpdir(), "kelin-md-card-media");
const MEDIA_CACHE_VERSION = "v2-faststart";
const CARD_VIDEO_CACHE = new Map();

mkdirSync(MEDIA_CACHE_DIR, { recursive: true });

// ── Tier mappings ─────────────────────────────────────────────────────────────

export const TIER_NAME = {
  "1": "Common",
  "2": "Uncommon",
  "3": "Rare",
  "4": "Epic",
  "5": "Legendary",
  "6": "Mythical",
  "S": "Secret",
};

export const TIER_NUM = {
  "common":    "1",
  "uncommon":  "2",
  "rare":      "3",
  "epic":      "4",
  "legendary": "5",
  "mythical":  "6",
  "secret":    "S",
  "s":         "S",
  "tier s":    "S",
  "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "S": "S",
};

export const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡", Mythical: "🔴", Secret: "🌟",
};

export const TIER_PRICE = {
  Common:    [100,    500],
  Uncommon:  [500,   2000],
  Rare:     [2000,   8000],
  Epic:    [8000,   25000],
  Legendary: [25000, 100000],
  Mythical:  [100000, 500000],
  Secret:    [500000, 2000000],
};

export function createSpawnId() {
  return Math.random().toString(16).slice(2, 7).padEnd(5, "0");
}

// Weighted spawn probability (higher weight = more common)
const TIER_WEIGHTS = [
  { num: "1", weight: 38 },
  { num: "2", weight: 24 },
  { num: "3", weight: 17 },
  { num: "4", weight: 10 },
  { num: "5", weight:  6 },
  { num: "6", weight:  4 },
  { num: "S", weight:  1 },
];
const TOTAL_WEIGHT = TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);

// ── In-memory cache ───────────────────────────────────────────────────────────

/** @type {{ cards: object[], fetchedAt: number } | null} */
let _cache = null;

/**
 * Fetch a single tier from the API.
 * @param {string} tier  "1"–"5"
 */
async function fetchTier(tier) {
  const res = await fetch(`${API_BASE}?tier=${tier}`);
  if (!res.ok) throw new Error(`Card API HTTP ${res.status} for tier ${tier}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(`Bad API response for tier ${tier}`);
  }
  return json.data;
}

/**
 * Return all cards across all tiers, using cache if still fresh.
 * @returns {Promise<object[]>}
 */
export async function fetchAllCards() {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.cards;
  }

  // Fetch all tiers in parallel (1–6 plus S)
  const results = await Promise.allSettled(["1", "2", "3", "4", "5", "6", "S"].map(fetchTier));
  const cards   = results
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value.map((raw, index) => normalise(raw, index + 1)));

  _cache = { cards, fetchedAt: now };
  return cards;
}

/** Force-clear the cache (useful for testing). */
export function clearCache() { _cache = null; }

// ── Redirect resolver ─────────────────────────────────────────────────────────

/** Map<originalUrl, resolvedUrl> — persists for the process lifetime */
const _urlCache = new Map();

/**
 * Resolve a URL to its final destination, following any 301/302 redirects.
 * Results are cached so each URL is only resolved once.
 * @param {string} url
 * @returns {Promise<string>} Final URL (or original if resolution fails)
 */
export async function resolveMediaUrl(url) {
  if (!url) return url;
  if (!url.includes("asapi.shoob.gg")) return url; // already a direct CDN link
  if (_urlCache.has(url)) return _urlCache.get(url);

  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    const location = res.headers.get("location");
    const resolved = location || url;
    _urlCache.set(url, resolved);
    return resolved;
  } catch {
    return url; // fall back to original on error
  }
}

// ── Card normalisation ────────────────────────────────────────────────────────

/**
 * Normalise a raw API card into a consistent internal shape.
 */
function normalise(raw, index) {
  const tierNum  = String(raw.tier);
  const tierName = TIER_NAME[tierNum] || "Common";
  const [min, max] = TIER_PRICE[tierName] || [100, 500];
  const price    = Math.floor(Math.random() * (max - min)) + min;

  return {
    cardId:    makeId(raw.title, tierNum),
    name:      raw.title,
    tier:      tierName,
    tierNum,
    series:    raw.series || "Unknown",
    index,
    media:     raw.url   || null,
    mediaType: (tierNum === "6" || tierNum === "S") ? "gif" : "image",
    price,
  };
}

/**
 * Generate a stable card ID from its title and tier.
 * e.g. "Zero Two and Hiro", "5" → "5_ZERO_TWO_AND_HIRO"
 */
function makeId(title, tierNum) {
  // Deterministic 5-digit number (10000–99999) from title + tier hash
  let hash = 0;
  const str = `${tierNum}:${title.toUpperCase()}`;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return String(10000 + (hash % 90000));
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Pick a random card using weighted tier probability.
 * @returns {Promise<object>}
 */
export async function pickRandomCard() {
  const all = await fetchAllCards();

  // Pick a tier by weight
  let roll = Math.random() * TOTAL_WEIGHT;
  let pickedNum = "1";
  for (const { num, weight } of TIER_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) { pickedNum = num; break; }
  }

  const pool = all.filter(c => c.tierNum === pickedNum);
  if (!pool.length) return all[Math.floor(Math.random() * all.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Search cards by name (case-insensitive substring).
 * @param {string} query
 * @param {number} [limit=10]
 * @returns {Promise<object[]>}
 */
export async function searchCards(query, limit = 10) {
  const all = await fetchAllCards();
  const re  = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return all.filter(c => re.test(c.name)).slice(0, limit);
}

/**
 * Find a single card by exact ID or closest name match.
 * @param {string} query  cardId or partial name
 * @returns {Promise<object | null>}
 */
export async function getCard(query) {
  const all = await fetchAllCards();
  // Exact ID
  const byId = all.find(c => c.cardId === query.toUpperCase());
  if (byId) return byId;
  // Exact name (case-insensitive)
  const byName = all.find(c => c.name.toLowerCase() === query.toLowerCase());
  if (byName) return byName;
  // Partial name
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return all.find(c => re.test(c.name)) || null;
}

/**
 * Return all cards of a given tier (by number string "1"–"5" or name).
 * @param {string} tier   "1"–"5" or "Common" etc.
 * @returns {Promise<object[]>}
 */
export async function getCardsByTier(tier) {
  const all    = await fetchAllCards();
  const num    = TIER_NUM[tier.toLowerCase()] || TIER_NUM[tier] || tier;
  return all.filter(c => c.tierNum === num);
}

/**
 * Return a count summary by tier without a full fetch (uses cache if warm,
 * otherwise fetches). Shape: { Common: N, Uncommon: N, ... }
 */
export async function getTierCounts() {
  const all = await fetchAllCards();
  const out = { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0, Mythical: 0, Secret: 0 };
  for (const c of all) {
    if (out[c.tier] !== undefined) out[c.tier]++;
  }
  return out;
}

/**
 * Fetch a single card from a specific tier directly from the API (bypasses cache).
 * Useful for quiz/spawn where you need a fresh random card of a given tier.
 * @param {string} tier  "1"–"6" or "S"
 * @returns {Promise<object|null>}
 */
export async function fetchCardByTier(tier) {
  const num = TIER_NUM[String(tier).toLowerCase()] ?? String(tier).toUpperCase();
  try {
    const raw   = await fetchTier(num);
    if (!raw.length) return null;
    const pick  = raw[Math.floor(Math.random() * raw.length)];
    return normalise(pick, 0);
  } catch (e) {
    console.error(`[cardApi] fetchCardByTier(${tier}) error:`, e.message);
    return null;
  }
}

function cardVideoPath(url) {
  const id = createHash("sha1").update(`${MEDIA_CACHE_VERSION}:${url}`).digest("hex");
  return join(MEDIA_CACHE_DIR, `${id}.mp4`);
}

/**
 * WhatsApp GIF messages are silent, short MP4 videos with gifPlayback=true.
 * The card API includes animated GIFs and WebPs that can be 10–25 MB. Sending
 * those URLs directly makes WhatsApp show them as heavy image media. Convert
 * them to a compact MP4 before sending.
 */
async function getGifVideo(url) {
  if (CARD_VIDEO_CACHE.has(url)) return CARD_VIDEO_CACHE.get(url);

  const pending = (async () => {
    const output = cardVideoPath(url);
    if (existsSync(output)) return readFileSync(output);

    const sourceExt = url.toLowerCase().includes(".webp") ? ".webp" : ".gif";
    const source = join(
      MEDIA_CACHE_DIR,
      `${createHash("sha1").update(`${url}:source`).digest("hex")}${sourceExt}`,
    );

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Card media HTTP ${response.status}`);
    writeFileSync(source, Buffer.from(await response.arrayBuffer()));

    try {
      await execFileAsync("ffmpeg", [
        "-hide_banner",
        "-loglevel", "error",
        "-y",
        "-i", source,
        "-t", "12",
        "-vf", "fps=15,scale=480:480:force_original_aspect_ratio=decrease,"
          + "pad=480:480:(ow-iw)/2:(oh-ih)/2:color=black",
        "-an",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-profile:v", "baseline",
        "-level", "3.0",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output,
      ], { timeout: 120_000, maxBuffer: 1024 * 1024 });
      return readFileSync(output);
    } finally {
      try { unlinkSync(source); } catch {}
    }
  })();

  CARD_VIDEO_CACHE.set(url, pending);
  try {
    return await pending;
  } catch (error) {
    CARD_VIDEO_CACHE.delete(url);
    throw error;
  }
}

/**
 * Send a card as a GIF (Tier 6 / S) or static image (all other tiers).
 * Centralises the image-vs-gif routing so every display point stays in sync.
 *
 * @param {object} sock     Baileys socket
 * @param {string} jid      Chat JID to send to
 * @param {object} card     Card object (must have .media, .tierNum, .mediaType)
 * @param {string} caption  Caption text
 * @param {object} [extra]  Extra sendMessage options (e.g. { quoted: msg, mentions: [...] })
 */
export async function sendCardMedia(sock, jid, card, caption, extra = {}) {
  if (!card.media) {
    return sock.sendMessage(jid, { text: caption, ...extra });
  }
  const url = await resolveMediaUrl(card.media);
  const isGif = card.tierNum === "6" || card.tierNum === "S" || card.mediaType === "gif";
  if (isGif) {
    try {
      const video = await getGifVideo(url);
      return sock.sendMessage(
        jid,
        { video, mimetype: "video/mp4", gifPlayback: true, caption, ...extra },
      );
    } catch (error) {
      console.error(`[cardApi] GIF conversion failed: ${error.message}`);
      return sock.sendMessage(
        jid,
        { video: { url }, mimetype: "video/mp4", gifPlayback: true, caption, ...extra },
      );
    }
  }
  return sock.sendMessage(jid, { image: { url }, caption, ...extra });
}
