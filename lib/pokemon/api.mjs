/**
 * KELIN MD — Pokémon API wrapper
 * Fetches Pokémon data from the official PokéAPI (https://pokeapi.co)
 *
 * PokéAPI is free, has no key requirement, and covers all 1025+ Pokémon
 * through Generation 9 (Scarlet/Violet), including Koraidon, Miraidon, etc.
 *
 * Official artwork sprites come from the PokeAPI sprites CDN — high-res PNG.
 */

const BASE_URL  = "https://pokeapi.co/api/v2/pokemon";
const MAX_POKEDEX_ID = 1025; // Gen 1–9 (Scarlet/Violet)

// ── Simple in-memory cache (avoids hammering the API on repeated spawns) ──────
const cache = new Map(); // key → { data, expiresAt }
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

async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { "User-Agent": "KelinMD-Bot/2.0" },
  });
  if (!res.ok) throw new Error(`PokéAPI error ${res.status} for ${url}`);
  return res.json();
}

/** Normalize a raw PokéAPI response into a clean Pokémon object */
function normalizePokemon(raw) {
  if (!raw) throw new Error("Empty Pokémon response");

  // Stats (PokéAPI format: [{ base_stat, stat: { name } }])
  const getStat = (name) => {
    if (Array.isArray(raw.stats)) {
      const s = raw.stats.find((s) => (s.stat?.name || s.name) === name);
      return s ? (s.base_stat ?? s.value ?? 10) : 10;
    }
    if (raw.stats && typeof raw.stats === "object") return raw.stats[name] ?? 10;
    return 10;
  };

  // Types (PokéAPI format: [{ slot, type: { name } }])
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

  // Prefer official HD artwork, fall back to front sprite, then CDN by ID
  const imageUrl =
    raw.sprites?.other?.["official-artwork"]?.front_default ||
    raw.sprites?.front_default ||
    raw.image || raw.imageUrl ||
    (pid ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pid}.png` : null);

  const backImageUrl =
    raw.sprites?.back_default ||
    raw.backImage ||
    (pid ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pid}.png` : null);

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
    height: raw.height ?? 10,
    weight: raw.weight ?? 100,
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

/** Fetch Pokémon by Pokédex ID */
export async function fetchById(id) {
  const key = `id:${id}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const raw  = await fetchJson(`${BASE_URL}/${id}`);
  const data = normalizePokemon(raw);
  cacheSet(key, data);
  cacheSet(`name:${data.name}`, data); // cross-cache by name too
  return data;
}

/** Fetch Pokémon by name (exact or close match) */
export async function fetchByName(name) {
  const normalized = String(name).trim().toLowerCase().replace(/\s+/g, "-");
  const key = `name:${normalized}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // PokéAPI accepts names directly: /v2/pokemon/charizard
  // Try the normalized name first, then a few common variants
  const attempts = [normalized];

  // "mega charizard x" → "charizard-mega-x"
  const megaMatch = normalized.match(/^mega-(.+)$/);
  if (megaMatch) attempts.push(`${megaMatch[1]}-mega`);
  const megaVariant = normalized.match(/^mega-(.+)-(x|y)$/);
  if (megaVariant) attempts.unshift(`${megaVariant[1]}-mega-${megaVariant[2]}`);

  for (const attempt of [...new Set(attempts)]) {
    try {
      const raw  = await fetchJson(`${BASE_URL}/${encodeURIComponent(attempt)}`);
      const data = normalizePokemon(raw);
      cacheSet(key, data);
      cacheSet(`id:${data.pokedexId}`, data);
      return data;
    } catch (err) {
      if (!err.message.includes("404")) throw err;
      // 404 → try next variant
    }
  }

  throw new Error(`No Pokémon found for "${name}"`);
}

/** Fetch a random Pokémon (IDs 1–1025, covers Gen 1–9) */
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
