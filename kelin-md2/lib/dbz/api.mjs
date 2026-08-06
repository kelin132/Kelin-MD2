/**
 * KELIN MD — Dragon Ball API wrapper (lib/dbz/api.mjs)
 * Fetches characters from https://dragonball-api.com/api and caches to MongoDB.
 *
 * Key design decisions:
 * - ki/maxKi from the API are display-flavor strings ("90 Septillion") — NOT used as stats.
 * - Base stats are derived from race formula seeded once and stored in Mongo.
 * - transformations[] from API are mapped into forms[] with a stat multiplier.
 * - role (hero/villain) defaults from affiliation with a manual override list.
 */

import { getDb } from "../mongo.mjs";

const BASE_URL = "https://dragonball-api.com/api";
const COLLECTION = "dbz_characters";

// ── Affiliation → role mapping ─────────────────────────────────────────────────
const VILLAIN_AFFILIATIONS = new Set([
  "Army of Frieza", "Villain", "Majin Buu's army", "Red Ribbon Army",
  "Cell's army", "Ginyu Force", "Planet trade organization",
]);

// Manual overrides: characters whose API affiliation doesn't match their battle role.
// Vegeta & Piccolo start as antagonists in canon but are treated as heroes in our roster.
const ROLE_OVERRIDES = {
  "Vegeta":    "hero",    // Originally a villain, becomes hero
  "Piccolo":   "hero",    // Same
  "Raditz":    "villain",
  "Nappa":     "villain",
  "Zarbon":    "villain",
  "Dodoria":   "villain",
  "Ginyu":     "villain",
  "Recoome":   "villain",
  "Burter":    "villain",
  "Jeice":     "villain",
  "Guldo":     "villain",
  "Babidi":    "villain",
  "Janemba":   "villain",
  "Beerus":    "villain", // antagonist for spawn purposes
};

function deriveRole(apiChar) {
  if (ROLE_OVERRIDES[apiChar.name] !== undefined) return ROLE_OVERRIDES[apiChar.name];
  const aff = apiChar.affiliation || "";
  if (aff === "Z Fighter" || aff === "Dragon Team") return "hero";
  if (VILLAIN_AFFILIATIONS.has(aff)) return "villain";
  // Freelancers / ambiguous → default hero (safe for player selection)
  return "hero";
}

// ── Race-based base stat seeds ─────────────────────────────────────────────────
// Saiyans: high ATK/SPD, Namekian: high HP/DEF, Android: high ATK/SPD, Majin: high HP
const RACE_STATS = {
  Saiyan:        { baseHp: 75, baseAttack: 80, baseDefense: 50, baseSpeed: 70 },
  Android:       { baseHp: 65, baseAttack: 85, baseDefense: 60, baseSpeed: 80 },
  Namekian:      { baseHp: 90, baseAttack: 60, baseDefense: 75, baseSpeed: 55 },
  Human:         { baseHp: 65, baseAttack: 55, baseDefense: 55, baseSpeed: 65 },
  Majin:         { baseHp:100, baseAttack: 70, baseDefense: 65, baseSpeed: 45 },
  "Frieza Race": { baseHp: 70, baseAttack: 75, baseDefense: 65, baseSpeed: 75 },
  Nucleico:      { baseHp: 80, baseAttack: 72, baseDefense: 68, baseSpeed: 60 },
  Angel:         { baseHp: 99, baseAttack: 95, baseDefense: 90, baseSpeed: 99 },
  Jiren:         { baseHp: 90, baseAttack: 90, baseDefense: 85, baseSpeed: 85 }, // special
};
const DEFAULT_STATS = { baseHp: 65, baseAttack: 62, baseDefense: 60, baseSpeed: 62 };

// Per-character tweaks so iconic fighters feel right
const CHAR_STAT_OVERRIDES = {
  "Goku":       { baseHp: 85, baseAttack: 90, baseDefense: 70, baseSpeed: 85 },
  "Vegeta":     { baseHp: 80, baseAttack: 88, baseDefense: 65, baseSpeed: 82 },
  "Gohan":      { baseHp: 82, baseAttack: 86, baseDefense: 68, baseSpeed: 78 },
  "Piccolo":    { baseHp: 88, baseAttack: 72, baseDefense: 80, baseSpeed: 65 },
  "Krillin":    { baseHp: 65, baseAttack: 65, baseDefense: 60, baseSpeed: 72 },
  "Trunks":     { baseHp: 78, baseAttack: 84, baseDefense: 70, baseSpeed: 80 },
  "Freezer":    { baseHp: 75, baseAttack: 86, baseDefense: 72, baseSpeed: 88 },
  "Celula":     { baseHp: 85, baseAttack: 85, baseDefense: 80, baseSpeed: 75 },
  "Majin Buu":  { baseHp:110, baseAttack: 75, baseDefense: 70, baseSpeed: 55 },
  "Broly":      { baseHp: 95, baseAttack: 95, baseDefense: 75, baseSpeed: 70 },
  "Jiren":      { baseHp: 95, baseAttack: 95, baseDefense: 88, baseSpeed: 90 },
  "Gogeta":     { baseHp: 92, baseAttack: 98, baseDefense: 82, baseSpeed: 95 },
  "Vegetto":    { baseHp: 92, baseAttack: 96, baseDefense: 84, baseSpeed: 93 },
  "Bardock":    { baseHp: 75, baseAttack: 78, baseDefense: 62, baseSpeed: 76 },
  "Android 17": { baseHp: 70, baseAttack: 82, baseDefense: 65, baseSpeed: 88 },
  "Android 18": { baseHp: 70, baseAttack: 80, baseDefense: 68, baseSpeed: 85 },
};

function buildBaseStats(apiChar) {
  if (CHAR_STAT_OVERRIDES[apiChar.name]) return { ...CHAR_STAT_OVERRIDES[apiChar.name] };
  const raceStats = RACE_STATS[apiChar.race] || DEFAULT_STATS;
  // Small pseudo-random variation so identical-race characters feel slightly different
  const seed = apiChar.id || 0;
  const jitter = (n) => Math.max(5, n + ((seed * 7 + n) % 11) - 5);
  return {
    baseHp:      jitter(raceStats.baseHp),
    baseAttack:  jitter(raceStats.baseAttack),
    baseDefense: jitter(raceStats.baseDefense),
    baseSpeed:   jitter(raceStats.baseSpeed),
  };
}

// ── Transformation → forms mapping ────────────────────────────────────────────
// Each form has: name, imageUrl, statMultiplier, auraColor
function buildForms(transformations = []) {
  return transformations
    .filter(t => t?.image && (t?.name || t?.title))
    .map((t, idx) => ({
      formIndex: idx + 1,
      name:      t.title || t.name,   // API returns "title", not "name"
      imageUrl:  t.image,
      // Later forms are more powerful: simple exponential step
      statMultiplier: parseFloat((1.3 + idx * 0.25).toFixed(2)),
      auraColor: idx === 0 ? "#ffdd00"
               : idx === 1 ? "#88aaff"
               : idx === 2 ? "#ff6600"
               : "#ffffff",
      kiFlavorText: t.ki || null,
    }));
}

// ── HTTP helper ────────────────────────────────────────────────────────────────
async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { Accept: "application/json", "User-Agent": "KelinMD-Bot/2.0" },
  });
  if (!res.ok) throw new Error(`DBZ API error ${res.status} for ${url}`);
  return res.json();
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fetch one page of the character list from the API. */
export async function fetchCharacterList({ page = 1, limit = 20 } = {}) {
  return fetchJson(`/characters?page=${page}&limit=${limit}`);
}

/** Fetch full character detail (with transformations) by API id. */
export async function fetchCharacterDetail(id) {
  return fetchJson(`/characters/${id}`);
}

/** Normalize a raw API character into our internal format. */
function normalizeCharacter(apiChar) {
  const stats = buildBaseStats(apiChar);
  return {
    id:           apiChar.id,
    name:         apiChar.name,
    race:         apiChar.race || "Unknown",
    gender:       apiChar.gender || "Unknown",
    description:  apiChar.description || "",
    affiliation:  apiChar.affiliation || "Unknown",
    // Flavor-only ki strings (display purposes: character select card, arrival scene)
    kiFlavorText:    apiChar.ki    || null,
    maxKiFlavorText: apiChar.maxKi || null,
    imageUrl:     apiChar.image || null,
    role:         deriveRole(apiChar),
    forms:        buildForms(apiChar.transformations || []),
    ...stats,
    syncedAt:     new Date(),
  };
}

/**
 * Sync the full roster from the Dragon Ball API into the `dbz_characters` Mongo collection.
 * Pages through meta.totalPages. Safe to re-run; upserts by id.
 */
export async function syncCharacters() {
  const db  = getDb();
  const col = db.collection(COLLECTION);

  let page  = 1;
  let total = 1;
  let synced = 0;

  while (page <= total) {
    let pageData;
    try {
      pageData = await fetchCharacterList({ page, limit: 20 });
    } catch (err) {
      console.error(`[dbz/api] sync page ${page} failed:`, err.message);
      break;
    }

    const items = pageData?.items || [];
    total = pageData?.meta?.totalPages || 1;

    for (const rawChar of items) {
      try {
        // Fetch detail to get transformations
        const detail = await fetchCharacterDetail(rawChar.id).catch(() => rawChar);
        const normalized = normalizeCharacter({ ...rawChar, ...detail });
        await col.updateOne(
          { id: normalized.id },
          { $set: normalized },
          { upsert: true }
        );
        synced++;
      } catch (err) {
        console.error(`[dbz/api] failed to sync char ${rawChar.id} (${rawChar.name}):`, err.message);
      }
    }

    page++;
  }

  console.log(`[dbz/api] Synced ${synced} DBZ characters to Mongo.`);
  return synced;
}

/** Get a single character from Mongo by id. Falls back to API if not cached. */
export async function getCharacterById(id) {
  const db  = getDb();
  const col = db.collection(COLLECTION);
  const cached = await col.findOne({ id: Number(id) });
  if (cached) return cached;

  // Not in cache — fetch and store
  try {
    const detail     = await fetchCharacterDetail(id);
    const normalized = normalizeCharacter(detail);
    await col.updateOne({ id: normalized.id }, { $set: normalized }, { upsert: true });
    return normalized;
  } catch {
    return null;
  }
}

/** Get a character by name (case-insensitive, partial match). From Mongo cache only. */
export async function getCharacterByName(name) {
  const db  = getDb();
  const col = db.collection(COLLECTION);
  const normalized = name.trim();
  return col.findOne({
    name: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") },
  });
}

/** List all cached characters, optionally filtering by role or paginating. */
export async function listCharacters({ page = 1, perPage = 8, role = null } = {}) {
  const db    = getDb();
  const col   = db.collection(COLLECTION);
  const query = role ? { role } : {};
  const skip  = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    col.find(query).skip(skip).limit(perPage).toArray(),
    col.countDocuments(query),
  ]);
  return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

/** Get a random villain from the cache. Returns null if none cached yet. */
export async function getRandomVillain() {
  const db  = getDb();
  const col = db.collection(COLLECTION);
  const villains = await col.find({ role: "villain" }).toArray();
  if (!villains.length) return null;
  return villains[Math.floor(Math.random() * villains.length)];
}

/** Get all villain characters from cache. */
export async function getAllVillains() {
  const db = getDb();
  return getDb().collection(COLLECTION).find({ role: "villain" }).toArray();
}

/** Check whether the cache is populated (at least 10 characters). */
export async function isCachePopulated() {
  const db    = getDb();
  const count = await db.collection(COLLECTION).countDocuments({});
  return count >= 10;
}
