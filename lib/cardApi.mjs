/**
 * KELIN MD — Card API helper
 * Fetches cards from https://cardapi.eclipse.name.ng/api/cards?tier=N
 * Caches all tiers in memory for 1 hour to avoid hammering the API.
 *
 * API response shape: { success, count, data: [{ tier, title, url, series }] }
 * Tier numbers: 1=Common  2=Uncommon  3=Rare  4=Epic  5=Legendary
 */

const API_BASE = "https://cardapi.eclipse.name.ng/api/cards";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Tier mappings ─────────────────────────────────────────────────────────────

export const TIER_NAME = {
  "1": "Common",
  "2": "Uncommon",
  "3": "Rare",
  "4": "Epic",
  "5": "Legendary",
};

export const TIER_NUM = {
  "common":    "1",
  "uncommon":  "2",
  "rare":      "3",
  "epic":      "4",
  "legendary": "5",
  "1": "1", "2": "2", "3": "3", "4": "4", "5": "5",
};

export const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
};

export const TIER_PRICE = {
  Common:    [100,   500],
  Uncommon:  [500,  2000],
  Rare:     [2000,  8000],
  Epic:    [8000,  25000],
  Legendary: [25000, 100000],
};

// Weighted spawn probability (higher weight = more common)
const TIER_WEIGHTS = [
  { num: "1", weight: 45 },
  { num: "2", weight: 25 },
  { num: "3", weight: 15 },
  { num: "4", weight:  8 },
  { num: "5", weight:  7 },
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

  // Fetch all 5 tiers in parallel
  const results = await Promise.all(["1", "2", "3", "4", "5"].map(fetchTier));
  const cards   = results.flat().map(normalise);

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
function normalise(raw) {
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
    media:     raw.url   || null,
    mediaType: "image",
    price,
  };
}

/**
 * Generate a stable card ID from its title and tier.
 * e.g. "Zero Two and Hiro", "5" → "5_ZERO_TWO_AND_HIRO"
 */
function makeId(title, tierNum) {
  const slug = title
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 24);
  return `${tierNum}_${slug}`;
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
  const out = { Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0 };
  for (const c of all) {
    if (out[c.tier] !== undefined) out[c.tier]++;
  }
  return out;
}
