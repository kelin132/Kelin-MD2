/**
 * KELIN MD — Pokémon API wrapper
 *
 * Priority order for data:
 *  1. Local files  — if present, uses the bundled data and sprites to avoid
 *                    external API calls and CDN image failures. Paths:
 *                    ./data/api/v2/pokemon/ and ./sprites/pokemon/
 *  2. Live API     — falls back to https://pokeapi.co when local data is absent.
 *
 * Export summary:
 *   fetchById(id)        — fetch by Pokédex number
 *   fetchByName(name)    — fetch by name (handles mega variants)
 *   fetchRandom()        — random Pokémon, IDs 1–1025
 *   fetchPokemon(query)  — auto-detects ID vs name
 *   getImageMessage(pok) — returns { image: Buffer } (local) or
 *                          { image: { url } } (CDN) — ready for sock.sendMessage
 */

import { readFile }        from "fs/promises";
import { fileURLToPath }   from "url";
import { dirname, join }   from "path";

// ── Path constants ─────────────────────────────────────────────────────────────
const __dirname    = dirname(fileURLToPath(import.meta.url));
const BOT_ROOT     = join(__dirname, "..", "..");

// These match the optional local data and sprite directories
const LOCAL_DATA           = join(BOT_ROOT, "data", "api", "v2", "pokemon");
const LOCAL_ART            = join(BOT_ROOT, "sprites", "pokemon", "other", "official-artwork");
const LOCAL_FRONT          = join(BOT_ROOT, "sprites", "pokemon");
const LOCAL_BACK           = join(BOT_ROOT, "sprites", "pokemon", "back");

// ── Live API ───────────────────────────────────────────────────────────────────
const BASE_URL        = "https://pokeapi.co/api/v2/pokemon";
const MAX_POKEDEX_ID  = 1025; // Gen 1–9 (Scarlet/Violet)
const MAX_SPRITE_BYTES = 12 * 1024 * 1024;
const SPRITE_TIMEOUT_MS = 15000;
const SPRITE_CDN_BASE = "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon";

// ── In-memory cache ────────────────────────────────────────────────────────────
const cache     = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ── Local-file helpers ─────────────────────────────────────────────────────────

/** Try to read + parse a local JSON file. Returns null on any error. */
async function readLocalJson(filePath) {
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Find the best available local sprite path for a Pokédex ID.
 * Prefers HD official-artwork, falls back to front sprite.
 * Returns the absolute path string, or null if not found locally.
 */
async function findLocalSprite(id) {
  const artPath = join(LOCAL_ART, `${id}.png`);
  try { await readFile(artPath); return artPath; } catch { /* not found */ }

  const frontPath = join(LOCAL_FRONT, `${id}.png`);
  try { await readFile(frontPath); return frontPath; } catch { /* not found */ }

  return null;
}

async function findLocalBackSprite(id) {
  const backPath = join(LOCAL_BACK, `${id}.png`);
  try { await readFile(backPath); return backPath; } catch { /* not found */ }
  return null;
}

// ── Live-API fetch ─────────────────────────────────────────────────────────────
async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "KelinMD-Bot/2.0" },
  });
  if (!res.ok) throw new Error(`PokéAPI error ${res.status} for ${url}`);
  return res.json();
}

// ── Normalizer ─────────────────────────────────────────────────────────────────
/** Normalize a raw PokéAPI response into a clean Pokémon object. */
function normalizePokemon(raw) {
  if (!raw) throw new Error("Empty Pokémon response");

  const getStat = (name) => {
    if (Array.isArray(raw.stats)) {
      const s = raw.stats.find((s) => (s.stat?.name || s.name) === name);
      return s ? (s.base_stat ?? s.value ?? 10) : 10;
    }
    if (raw.stats && typeof raw.stats === "object") return raw.stats[name] ?? 10;
    return 10;
  };

  let types = [];
  if (Array.isArray(raw.types)) {
    types = raw.types
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((t) => typeof t === "string" ? t : (t.type?.name ?? t.name ?? "normal"));
  } else if (typeof raw.type === "string") {
    types = [raw.type];
  } else {
    types = ["normal"];
  }

  const pid = raw.id ?? raw.pokedexId;

  const frontSpriteUrl =
    raw.sprites?.front_default ||
    (pid ? `${SPRITE_CDN_BASE}/${pid}.png` : null);

  const imageUrl =
    raw.sprites?.other?.["official-artwork"]?.front_default ||
    frontSpriteUrl ||
    raw.image || raw.imageUrl ||
    (pid ? `${SPRITE_CDN_BASE}/other/official-artwork/${pid}.png` : null);

  const backSpriteUrl =
    raw.sprites?.back_default ||
    (pid ? `${SPRITE_CDN_BASE}/back/${pid}.png` : null);

  const backImageUrl =
    backSpriteUrl ||
    raw.backImage ||
    (pid ? `${SPRITE_CDN_BASE}/back/${pid}.png` : null);

  return {
    pokedexId:    pid ?? 1,
    name:         (raw.name || "unknown").toLowerCase().replace(/-/g, " "),
    displayName:  capitalize(raw.name || "Unknown"),
    types,
    primaryType:  types[0] || "normal",
    baseHp:       getStat("hp"),
    baseAttack:   getStat("attack"),
    baseDefense:  getStat("defense"),
    baseSpeed:    getStat("speed"),
    baseSpAtk:    getStat("special-attack"),
    imageUrl,
    backImageUrl,
    frontSpriteUrl,
    backSpriteUrl,
    // imageLocalPath is set after normalization when local sprites exist
    imageLocalPath:     null,
    backImageLocalPath: null,
    height: raw.height ?? 10,
    weight: raw.weight ?? 100,
  };
}

function spriteCandidates(id, back = false) {
  if (!Number.isInteger(id) || id <= 0) return [];
  if (back) {
    return [
      `${SPRITE_CDN_BASE}/back/${id}.png`,
      `https://raw.githack.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`,
    ];
  }
  return [
    `${SPRITE_CDN_BASE}/other/official-artwork/${id}.png`,
    `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${String(id).padStart(3, "0")}.png`,
    `https://raw.githack.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  ];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

// ── Public image helper ────────────────────────────────────────────────────────
/**
 * Returns the image payload ready for sock.sendMessage:
 *   { image: Buffer }          — when local sprite file is available (no CDN)
 *   { image: { url: string } } — when falling back to remote CDN URL
 *   null                       — no image available at all
 *
 * Usage:
 *   const imgMsg = await getImageMessage(apiData);
 *   if (imgMsg) {
 *     try { await sock.sendMessage(jid, { ...imgMsg, caption }); return; } catch {}
 *   }
 *   await sock.sendMessage(jid, { text: caption });
 */
async function readRemoteSprite(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SPRITE_TIMEOUT_MS),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "KelinMD-Bot/2.0",
      },
    });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.startsWith("image/")) return null;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_SPRITE_BYTES) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_SPRITE_BYTES) return null;
    return buffer;
  } catch {
    return null;
  }
}

async function imagePayload(localPath, urls) {
  if (localPath) {
    try {
      const buffer = await readFile(localPath);
      if (buffer.length) return { image: buffer };
    } catch { /* try remote candidates */ }
  }
  for (const url of [...new Set(urls.filter(Boolean))]) {
    const buffer = await readRemoteSprite(url);
    if (buffer) return { image: buffer };
  }
  return null;
}

export async function getImageMessage(pokemon) {
  const id = Number(pokemon?.pokedexId);
  return imagePayload(
    pokemon?.imageLocalPath,
    [pokemon?.imageUrl, pokemon?.frontSpriteUrl, ...spriteCandidates(id)],
  );
}

/**
 * Same as getImageMessage but returns the *back* sprite (for battles).
 */
export async function getBackImageMessage(pokemon) {
  const id = Number(pokemon?.pokedexId);
  return imagePayload(
    pokemon?.backImageLocalPath,
    [pokemon?.backImageUrl, pokemon?.backSpriteUrl, ...spriteCandidates(id, true)],
  );
}

// ── Core fetch functions ───────────────────────────────────────────────────────

/** Fetch Pokémon by Pokédex ID — tries local data first, then live API */
export async function fetchById(id) {
  const key = `id:${id}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // ── 1. Try optional local data ─────────────────────────────────────────────
  const localRaw = await readLocalJson(join(LOCAL_DATA, String(id), "index.json"));
  if (localRaw) {
    const data = normalizePokemon(localRaw);
    data.imageLocalPath     = await findLocalSprite(id);
    data.backImageLocalPath = await findLocalBackSprite(id);
    cacheSet(key, data);
    cacheSet(`name:${data.name}`, data);
    return data;
  }

  // ── 2. Fall back to live PokéAPI ───────────────────────────────────────────
  const raw  = await fetchJson(`${BASE_URL}/${id}`);
  const data = normalizePokemon(raw);
  cacheSet(key, data);
  cacheSet(`name:${data.name}`, data);
  return data;
}

/** Fetch Pokémon by name — tries local data first, then live API */
export async function fetchByName(name) {
  const normalized = String(name).trim().toLowerCase().replace(/\s+/g, "-");
  const key = `name:${normalized}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // ── 1. Try local data ──────────────────────────────────────────────────────
  const localRaw = await readLocalJson(join(LOCAL_DATA, normalized, "index.json"));
  if (localRaw) {
    const data = normalizePokemon(localRaw);
    const id   = data.pokedexId;
    data.imageLocalPath     = await findLocalSprite(id);
    data.backImageLocalPath = await findLocalBackSprite(id);
    cacheSet(key, data);
    cacheSet(`id:${id}`, data);
    return data;
  }

  // ── 2. Fall back to live API ───────────────────────────────────────────────
  const attempts = [normalized];

  const megaMatch = normalized.match(/^mega-(.+)$/);
  if (megaMatch) attempts.push(`${megaMatch[1]}-mega`);
  const megaVariant = normalized.match(/^mega-(.+)-(x|y)$/);
  if (megaVariant) attempts.unshift(`${megaVariant[1]}-mega-${megaVariant[2]}`);

  for (const attempt of [...new Set(attempts)]) {
    // Also try local for mega/variant names
    const varLocal = await readLocalJson(join(LOCAL_DATA, attempt, "index.json"));
    if (varLocal) {
      const data = normalizePokemon(varLocal);
      data.imageLocalPath     = await findLocalSprite(data.pokedexId);
      data.backImageLocalPath = await findLocalBackSprite(data.pokedexId);
      cacheSet(key, data);
      cacheSet(`id:${data.pokedexId}`, data);
      return data;
    }

    try {
      const raw  = await fetchJson(`${BASE_URL}/${encodeURIComponent(attempt)}`);
      const data = normalizePokemon(raw);
      cacheSet(key, data);
      cacheSet(`id:${data.pokedexId}`, data);
      return data;
    } catch (err) {
      if (!err.message.includes("404")) throw err;
    }
  }

  throw new Error(`No Pokémon found for "${name}"`);
}

/** Fetch a random Pokémon (IDs 1–1025, Gen 1–9) */
export async function fetchRandom() {
  const id = Math.floor(Math.random() * MAX_POKEDEX_ID) + 1;
  return fetchById(id);
}

/** Fetch any Pokémon — accepts ID (number/numeric string) or name */
export async function fetchPokemon(query) {
  if (typeof query === "number" || /^\d+$/.test(String(query))) {
    return fetchById(Number(query));
  }
  return fetchByName(String(query));
}
