/**
 * KELIN MD — Card API helper
 * Fetches the normal-card snapshot from EulaCard and caches it for 1 hour.
 * Event-tagged cards are excluded before they enter the bot's catalog.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getSeriesCached, prefetchSeries } from "./seriesEnrich.mjs";

const API_BASE = "https://eula-cardapi.suhotech.xyz/api/download";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const API_FETCH_TIMEOUT_MS = 45_000;  // The full card snapshot is about 62 MB.
const MEDIA_FETCH_TIMEOUT_MS = 30_000; // 30 seconds for downloading card images
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
  "C": "C",
  "R": "R",
  "SR": "SR",
  "SSR": "SSR",
  "UR": "UR",
  "X": "X",
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
  "c": "C",
  "tier c": "C",
  "r": "R",
  "tier r": "R",
  "sr": "SR",
  "tier sr": "SR",
  "ssr": "SSR",
  "tier ssr": "SSR",
  "ur": "UR",
  "tier ur": "UR",
  "x": "X",
  "tier x": "X",
  "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6",
  "S": "S", "C": "C", "R": "R", "SR": "SR", "SSR": "SSR", "UR": "UR", "X": "X",
};

export const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡", Mythical: "🔴", Secret: "🌟",
  C: "💠", R: "🔷", SR: "🟣", SSR: "💎", UR: "🌠", X: "✨",
};

export const TIER_PRICE = {
  Common:    [100,    500],
  Uncommon:  [500,   2000],
  Rare:     [2000,   8000],
  Epic:    [8000,   25000],
  Legendary: [25000, 100000],
  Mythical:  [100000, 500000],
  Secret:    [1000000, 5000000],
  C:         [600000, 800000],
  R:         [800000, 1000000],
  SR:        [1000000, 5000000],
  SSR:       [5000000, 10000000],
  UR:        [10000000, 20000000],
  X:         [20000000, 50000000],
};

export function createSpawnId() {
  return Math.random().toString(16).slice(2, 7).padEnd(5, "0");
}

/** Build the shared bordered caption used by manual and automatic card spawns. */
export function buildCardSpawnCaption(card, spawnId, prefix = ".") {
  const claimId = card.claimId || card.index || card.cardId;
  return `╭─❀「 🃏 *𝐂𝐀𝐑𝐃 𝐒𝐏𝐀𝐖𝐍* 」❀─╮
│ 🃏 *Name*   :: *${card.name}*
│ ⭐ *Tier*   :: *${card.tier}*
│ 📺 *Series* :: *${card.series}*
│ 🆔 *Claim #* :: \`${claimId}\`
│ 🔹 *Spawn*  :: \`${spawnId}\`
│
│ 💬 Type *${prefix}claim ${claimId}* to grab it!
│ ⚡ First come, first served~
╰───────────────❀`;
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
  { num: "C", weight: 0.5 },
  { num: "R", weight: 0.3 },
  { num: "SR", weight: 0.15 },
  { num: "SSR", weight: 0.05 },
  { num: "UR", weight: 0.02 },
  { num: "X", weight: 0.01 },
];
const TOTAL_WEIGHT = TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);

// ── In-memory cache ───────────────────────────────────────────────────────────

/** @type {{ cards: object[], fetchedAt: number } | null} */
let _cache = null;

/**
 * Return all cards across all tiers, using cache if still fresh.
 * Throws a descriptive CARD_API_DOWN error when the external API is unreachable,
 * so callers can surface a clear message to users instead of a generic failure.
 * @returns {Promise<object[]>}
 */
export async function fetchAllCards() {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.cards;
  }

  let sourceCards;
  try {
    const response = await fetch(API_BASE, {
      signal: AbortSignal.timeout(API_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Card API HTTP ${response.status}`);
    const payload = await response.json();
    sourceCards = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload?.data)
          ? payload.data
          : null;
    if (!sourceCards) throw new Error("Unexpected card catalog response");
  } catch (error) {
    const err = new Error(
      `Card API is currently unreachable — please try again later. (${error?.message ?? "request failed"})`
    );
    err.code = "CARD_API_DOWN";
    throw err;
  }

  const cards = sourceCards
    .filter(raw => !String(raw?.event ?? "").trim())
    .map((raw, index) => normalise(raw, index + 1));
  if (!cards.length) {
    const err = new Error("The card catalog currently has no non-event cards.");
    err.code = "CARD_API_DOWN";
    throw err;
  }

  _cache = { cards, fetchedAt: Date.now() };

  // Background-enrich series names for cards that are still "Unknown".
  // This runs async without blocking the caller — subsequent fetches
  // from cache will have the enriched series populated by then.
  const unenriched = cards.filter(c => c.series === "Unknown").map(c => c.name);
  if (unenriched.length > 0) prefetchSeries(unenriched);

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
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
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
 * Uses the in-memory series cache when available (populated by prefetchSeries).
 */
function normalise(raw, index) {
  const tierNum  = String(raw.tier ?? "").toUpperCase();
  const tierName = TIER_NAME[tierNum] || `Tier ${tierNum || "?"}`;
  const [min, max] = TIER_PRICE[tierName] || [100, 500];
  const sourcePrice = Number(raw.value);
  const usesNewTier = ["C", "R", "SR", "SSR", "UR", "X"].includes(tierNum);
  const price = usesNewTier && raw.value_currency === "coins" && Number.isFinite(sourcePrice) && sourcePrice > 0
    ? Math.round(sourcePrice)
    : Math.floor(Math.random() * (max - min)) + min;
  const media = raw.image || raw.url || null;
  const mediaType = String(raw.media_type ?? "").toLowerCase() === "gif"
    || raw.is_animated === true
    || /\.gif(?:$|[?#])/i.test(String(media || ""))
    ? "gif"
    : "image";

  // Check series enrichment cache (populated async after first full fetch)
  const cachedSeries = getSeriesCached(raw.title);

  return {
    cardId:    String(raw.id || makeId(raw.title || raw.name, tierNum)).toUpperCase(),
    claimId:   String(index),
    name:      raw.title || raw.name || "Unknown",
    tier:      tierName,
    tierNum,
    series:    raw.series || cachedSeries || "Unknown",
    index,
    media,
    mediaType,
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
  const needle = String(query ?? "").trim().toUpperCase();
  // Exact ID
  const byId = all.find(c => c.cardId === needle);
  if (byId) return byId;
  // Continue to resolve old five-digit IDs already used by earlier bot cards.
  const legacyId = all.find(c => makeId(c.name, c.tierNum) === needle);
  if (legacyId) return legacyId;
  // Exact name (case-insensitive)
  const byName = all.find(c => c.name.toLowerCase() === String(query ?? "").trim().toLowerCase());
  if (byName) return byName;
  // Partial name
  const re = new RegExp(String(query ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return all.find(c => re.test(c.name)) || null;
}

/**
 * Return all cards of a given tier (by tier code or name).
 * @param {string} tier   "1"–"5" or "Common" etc.
 * @returns {Promise<object[]>}
 */
export async function getCardsByTier(tier) {
  const all    = await fetchAllCards();
  const value  = String(tier ?? "").trim();
  const num    = TIER_NUM[value.toLowerCase()] || TIER_NUM[value.toUpperCase()] || value.toUpperCase();
  return all.filter(c => c.tierNum === num);
}

/**
 * Return a count summary by tier without a full fetch (uses cache if warm,
 * otherwise fetches). Shape: { Common: N, Uncommon: N, ... }
 */
export async function getTierCounts() {
  const all = await fetchAllCards();
  const out = Object.fromEntries(Object.values(TIER_NAME).map(name => [name, 0]));
  for (const c of all) {
    if (out[c.tier] !== undefined) out[c.tier]++;
  }
  return out;
}

/**
 * Pick a card from a specific tier in the cached catalog.
 * @param {string} tier  A tier code or name.
 * @returns {Promise<object|null>}
 */
export async function fetchCardByTier(tier) {
  try {
    const cards = await getCardsByTier(tier);
    if (!cards.length) return null;
    return cards[Math.floor(Math.random() * cards.length)];
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

    const response = await fetch(url, { signal: AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS) });
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
  const isGif = card.mediaType === "gif"
    || (card.mediaType !== "image" && (card.tierNum === "6" || card.tierNum === "S"));
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
