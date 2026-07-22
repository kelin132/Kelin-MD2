/**
 * KELIN MD — Pokémon API wrapper
 * Fetches Pokémon data from https://pokeapi.eclipse.name.ng
 */

const BASE_URL = "https://pokeapi.eclipse.name.ng/api/pokemon";

async function fetchJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "KelinMD-Bot/1.0" },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
  return res.json();
}

/** Normalize the raw API response into a clean Pokémon object */
function normalizePokemon(raw) {
  if (!raw) throw new Error("Empty Pokémon response");

  // Support both array-style and object-style stat formats
  const getStat = (name) => {
    if (Array.isArray(raw.stats)) {
      const s = raw.stats.find((s) => (s.stat?.name || s.name) === name);
      return s ? (s.base_stat ?? s.value ?? s.baseStat ?? 10) : 10;
    }
    if (raw.stats && typeof raw.stats === "object") return raw.stats[name] ?? 10;
    return 10;
  };

  // Type extraction (handles both [{type:{name:...}}] and ["fire"])
  let types = [];
  if (Array.isArray(raw.types)) {
    types = raw.types.map((t) =>
      typeof t === "string" ? t : (t.type?.name ?? t.name ?? "normal")
    );
  } else if (typeof raw.type === "string") {
    types = [raw.type];
  } else {
    types = ["normal"];
  }

  // Image URL — try several common keys
  const image =
    raw.image ||
    raw.imageUrl ||
    raw.sprites?.front_default ||
    raw.sprite ||
    raw.sprites?.other?.["official-artwork"]?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${raw.id}.png`;

  const backImage =
    raw.backImage ||
    raw.sprites?.back_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${raw.id}.png`;

  return {
    pokedexId: raw.id || raw.pokedexId || 1,
    name: (raw.name || "Unknown").toLowerCase().replace(/-/g, " "),
    displayName: capitalize(raw.name || "Unknown"),
    types,
    primaryType: types[0] || "normal",
    baseHp: getStat("hp"),
    baseAttack: getStat("attack"),
    baseDefense: getStat("defense"),
    baseSpeed: getStat("speed"),
    baseSpAtk: getStat("special-attack") || getStat("sp_atk") || getStat("spatk") || 50,
    imageUrl: image,
    backImageUrl: backImage,
    height: raw.height ?? 10,
    weight: raw.weight ?? 100,
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

/** Fetch a random Pokémon */
export async function fetchRandom() {
  const raw = await fetchJson(`${BASE_URL}/random`);
  return normalizePokemon(raw);
}

/** Fetch Pokémon by name or search term */
export async function fetchByName(name) {
  const raw = await fetchJson(`${BASE_URL}?search=${encodeURIComponent(name)}`);
  // Some APIs return an array; take first result
  const data = Array.isArray(raw) ? raw[0] : raw;
  return normalizePokemon(data);
}

/** Fetch Pokémon by Pokédex ID */
export async function fetchById(id) {
  const raw = await fetchJson(`${BASE_URL}/${id}`);
  return normalizePokemon(raw);
}

/** Fetch any Pokémon (by id or name) */
export async function fetchPokemon(query) {
  if (typeof query === "number" || /^\d+$/.test(String(query))) {
    return fetchById(Number(query));
  }
  return fetchByName(String(query));
}
