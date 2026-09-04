/**
 * KELIN MD — Dragon Ball Z API helper
 * Wraps the Dragon Ball API (https://dragonball-api.com/api/)
 * for character images, transformations, and form data.
 * All functions are cached in-memory for 30 minutes.
 */

const BASE     = "https://dragonball-api.com/api";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const _cache = new Map();

async function cached(key, fetcher) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) return hit.data;
  try {
    const data = await fetcher();
    _cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch { return null; }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (KelinMD-Bot)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Race → playable character options ─────────────────────────────────────────
export const RACE_CHARACTER_OPTIONS = {
  Saiyan:        ["Goku", "Vegeta", "Gohan", "Trunks", "Bardock", "Broly", "Gotenks"],
  Human:         ["Krillin", "Yamcha", "Tenshinhan", "Master Roshi", "Mr. Satan"],
  Namekian:      ["Piccolo", "Dende", "Nail"],
  Android:       ["Android 17", "Android 18"],
  Majin:         ["Majin Buu"],
  "Frieza Race": ["Freezer"],
};

export const RACES = Object.keys(RACE_CHARACTER_OPTIONS);

export function getRaceCharacterOptions(race) {
  return RACE_CHARACTER_OPTIONS[race] || [race];
}

// ── Name → API ID mapping ─────────────────────────────────────────────────────
const NAME_TO_ID = {
  "Goku": 1, "Vegeta": 2, "Piccolo": 3, "Bulma": 4, "Freezer": 5,
  "Zarbon": 6, "Dodoria": 7, "Ginyu": 8, "Celula": 9, "Gohan": 10,
  "Krillin": 11, "Tenshinhan": 12, "Yamcha": 13, "Chi-Chi": 14,
  "Gotenks": 15, "Trunks": 16, "Master Roshi": 17, "Bardock": 18,
  "Mr. Satan": 20, "Dende": 21, "Android 17": 22, "Android 18": 64,
  "Nail": 29, "Raditz": 30, "Babidi": 31, "Majin Buu": 32,
  "Jiren": 38, "Gogeta": 65, "Vegetto": 66, "Janemba": 67, "Broly": 68,
};

// ── Static fallback images ─────────────────────────────────────────────────────
export const CHAR_IMAGES = {
  "Goku":         "https://dragonball-api.com/characters/goku_normal.webp",
  "Vegeta":       "https://dragonball-api.com/characters/vegeta_normal.webp",
  "Piccolo":      "https://dragonball-api.com/characters/picolo_normal.webp",
  "Gohan":        "https://dragonball-api.com/characters/gohan.webp",
  "Krillin":      "https://dragonball-api.com/characters/krillin.webp",
  "Trunks":       "https://dragonball-api.com/characters/trunks.webp",
  "Freezer":      "https://dragonball-api.com/characters/Freezer.webp",
  "Celula":       "https://dragonball-api.com/characters/celula.webp",
  "Majin Buu":    "https://dragonball-api.com/characters/majin_buu.webp",
  "Bardock":      "https://dragonball-api.com/characters/bardock.webp",
  "Android 17":   "https://dragonball-api.com/characters/android_17.webp",
  "Android 18":   "https://dragonball-api.com/characters/android_18.webp",
  "Broly":        "https://dragonball-api.com/characters/broly.webp",
  "Zarbon":       "https://dragonball-api.com/characters/zarbon.webp",
  "Dodoria":      "https://dragonball-api.com/characters/dodoria.webp",
  "Raditz":       "https://dragonball-api.com/characters/raditz.webp",
  "Janemba":      "https://dragonball-api.com/characters/janemba.webp",
  "Tenshinhan":   "https://dragonball-api.com/characters/tenshinhan.webp",
  "Yamcha":       "https://dragonball-api.com/characters/yamcha.webp",
  "Gogeta":       "https://dragonball-api.com/characters/gogeta.webp",
  "Vegetto":      "https://dragonball-api.com/characters/vegetto.webp",
  "Ginyu":        "https://dragonball-api.com/characters/ginyu.webp",
  "Nail":         "https://dragonball-api.com/characters/picolo_normal.webp",
  "Dende":        "https://dragonball-api.com/characters/picolo_normal.webp",
  "Mr. Satan":    "https://dragonball-api.com/characters/mr_satan.webp",
  "Master Roshi": "https://dragonball-api.com/characters/master_roshi.webp",
  "Jiren":        "https://dragonball-api.com/characters/jiren.webp",
  "Babidi":       "https://dragonball-api.com/characters/babidi.webp",
  "Nappa":        "https://dragonball-api.com/characters/vegeta_normal.webp",
  "Saibaman":     "https://dragonball-api.com/characters/raditz.webp",
  "Cui":          "https://dragonball-api.com/characters/zarbon.webp",
  "Super Buu":    "https://dragonball-api.com/characters/majin_buu.webp",
  "Kid Buu":      "https://dragonball-api.com/characters/majin_buu.webp",
};

/**
 * Get a character's image URL by name.
 */
export async function getCharacterImage(name) {
  if (CHAR_IMAGES[name]) return CHAR_IMAGES[name];
  const id = NAME_TO_ID[name];
  if (!id) return null;
  return cached(`img:${id}`, async () => {
    const char = await get(`/characters/${id}`);
    return char?.image || null;
  });
}

/**
 * Get full character info (including transformations) by name or ID.
 */
export async function getCharacterInfo(nameOrId) {
  if (typeof nameOrId === "number") {
    return cached(`char:${nameOrId}`, () => get(`/characters/${nameOrId}`));
  }
  const id = NAME_TO_ID[nameOrId];
  if (id) return cached(`char:${id}`, () => get(`/characters/${id}`));
  return cached(`search:${nameOrId.toLowerCase()}`, async () => {
    const data = await get("/characters?limit=58");
    const items = data?.items || [];
    const found =
      items.find((c) => c.name.toLowerCase() === nameOrId.toLowerCase()) ||
      items.find((c) => c.name.toLowerCase().includes(nameOrId.toLowerCase()));
    if (!found) return null;
    return get(`/characters/${found.id}`);
  });
}

/**
 * Get all characters (cached).
 */
export async function getAllCharacters() {
  return cached("all_characters", async () => {
    const data = await get("/characters?limit=58");
    return data?.items || [];
  });
}

/**
 * Get villain characters for spawn/enemy encounters.
 */
export async function getVillainsForSpawn() {
  const all = await getAllCharacters();
  return (all || []).filter((c) =>
    ["Army of Frieza", "Villain", "Android", "Majin", "Freelancer"].includes(c.affiliation)
  );
}

/**
 * Send a message with a real Dragon Ball character image.
 * Falls back to text-only if the image fetch fails.
 */
export async function sendWithDBZImage(sock, jid, msg, caption, characterName) {
  let imgUrl = null;
  try { imgUrl = await getCharacterImage(characterName); } catch { /**/ }
  try {
    if (imgUrl) {
      return await sock.sendMessage(jid, { image: { url: imgUrl }, caption }, { quoted: msg });
    }
  } catch { /**/ }
  return sock.sendMessage(jid, { text: caption }, { quoted: msg });
}
