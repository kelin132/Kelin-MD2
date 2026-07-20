/**
 * KELIN MD — Naruto API helper
 * Wraps the Dattebayo API (https://dattebayo-api.onrender.com)
 * for character images, jutsu info, and clan art.
 *
 * All functions are cached in-memory for 30 minutes so
 * the free API isn't hammered on every command.
 */

const BASE = "https://dattebayo-api.onrender.com";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/** Simple in-memory cache: key → { data, fetchedAt } */
const _cache = new Map();

async function cached(key, fetcher) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) return hit.data;
  try {
    const data = await fetcher();
    _cache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Clan → representative character name mapping ──────────────────────────────
const CLAN_CHARACTERS = {
  Uchiha:   "Sasuke Uchiha",
  Hyuga:    "Hinata Hyuga",
  Uzumaki:  "Naruto Uzumaki",
  Senju:    "Hashirama Senju",
  Nara:     "Shikamaru Nara",
  Akimichi: "Choji Akimichi",
  Aburame:  "Shino Aburame",
  Inuzuka:  "Kiba Inuzuka",
  Yamanaka: "Ino Yamanaka",
  Hatake:   "Kakashi Hatake",
  Sarutobi: "Hiruzen Sarutobi",
  Namikaze: "Minato Namikaze",
};

// ── Village → scenic/iconic image (static wiki images) ───────────────────────
const VILLAGE_IMAGES = {
  "Hidden Leaf":  "https://static.wikia.nocookie.net/naruto/images/2/2b/Konohagakure_Symbol.svg",
  "Hidden Sand":  "https://static.wikia.nocookie.net/naruto/images/f/f4/Sunagakure_Symbol.svg",
  "Hidden Mist":  "https://static.wikia.nocookie.net/naruto/images/b/b5/Kirigakure_Symbol.svg",
  "Hidden Cloud": "https://static.wikia.nocookie.net/naruto/images/7/77/Kumogakure_Symbol.svg",
  "Hidden Stone": "https://static.wikia.nocookie.net/naruto/images/9/94/Iwagakure_Symbol.svg",
  "Hidden Rain":  "https://static.wikia.nocookie.net/naruto/images/d/d8/Amegakure_Symbol.svg",
  "Hidden Sound": "https://static.wikia.nocookie.net/naruto/images/7/7c/Otogakure_Symbol.svg",
};

// ── Enemy name → Dattebayo character search term ─────────────────────────────
const ENEMY_CHARACTERS = {
  "Akatsuki Grunt":        "Konan",
  "Orochimaru's Minion":   "Orochimaru",
  "Sound Ninja":           "Kimimaro",
  "Madara's Clone":        "Madara Uchiha",
  "Zetsu":                 "Zetsu",
  "Jonin Defector":        "Zabuza Momochi",
  "Missing-nin":           "Hidan",
  "Sand Puppet Master":    "Sasori",
  "Seven Swordsmen Remnant": "Kisame Hoshigaki",
  "Rogue Sensor Ninja":    "Konan",
  "War Veteran":           "Nagato",
};

// ── High-quality static Naruto image fallbacks ────────────────────────────────
export const NARUTO_IMAGES = {
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
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for a character by name. Returns the first match or null.
 */
export async function searchCharacter(name) {
  return cached(`char:${name.toLowerCase()}`, async () => {
    const data = await get(`/characters?name=${encodeURIComponent(name)}&limit=5`);
    const list = Array.isArray(data) ? data : data?.characters ?? [];
    return list[0] ?? null;
  });
}

/**
 * Get the best image URL for a character by name.
 * Returns a wiki PNG URL, or a themed fallback.
 */
export async function getCharacterImage(name, fallbackKey = "profile") {
  try {
    const char = await searchCharacter(name);
    if (char?.images?.length) return char.images[char.images.length - 1];
  } catch { /* fall through */ }
  return NARUTO_IMAGES[fallbackKey] ?? NARUTO_IMAGES.profile;
}

/**
 * Get a character image URL based on a player's clan name.
 */
export async function getClanImage(clanName, fallbackKey = "profile") {
  const charName = CLAN_CHARACTERS[clanName];
  if (!charName) return NARUTO_IMAGES[fallbackKey] ?? NARUTO_IMAGES.profile;
  return getCharacterImage(charName, fallbackKey);
}

/**
 * Get a themed image for a named enemy.
 */
export async function getEnemyImage(enemyName) {
  const charName = ENEMY_CHARACTERS[enemyName];
  if (charName) return getCharacterImage(charName, "enemy");
  return NARUTO_IMAGES.enemy;
}

/**
 * Get a village symbol image by village name.
 */
export function getVillageImage(villageName) {
  for (const [key, url] of Object.entries(VILLAGE_IMAGES)) {
    if (villageName?.includes(key) || key.includes(villageName || "")) return url;
  }
  return null;
}

/**
 * Fetch full character info for the .nchar command.
 * Returns { name, images, jutsu, natureType, family, debut } or null.
 */
export async function getCharacterInfo(name) {
  return searchCharacter(name);
}

/**
 * Fetch a list of characters (paginated).
 */
export async function listCharacters(page = 1, limit = 20) {
  return cached(`list:${page}:${limit}`, async () => {
    const data = await get(`/characters?page=${page}&limit=${limit}`);
    return Array.isArray(data) ? data : data?.characters ?? [];
  });
}

/**
 * Fetch jutsu info by name from Dattebayo.
 */
export async function getJutsuInfo(name) {
  return cached(`jutsu:${name.toLowerCase()}`, async () => {
    const data = await get(`/jutsu?name=${encodeURIComponent(name)}&limit=5`);
    const list = Array.isArray(data) ? data : data?.jutsu ?? [];
    return list[0] ?? null;
  });
}

/**
 * Send a message with a real Naruto character image as the caption image.
 * Falls back to Giphy/text if the image fetch fails.
 */
export async function sendWithNarutoImage(sock, jid, msg, caption, imageSource) {
  let imgUrl = null;

  try {
    if (typeof imageSource === "string" && imageSource.startsWith("http")) {
      imgUrl = imageSource;
    } else if (typeof imageSource === "object" && imageSource?.clan) {
      imgUrl = await getClanImage(imageSource.clan);
    } else if (typeof imageSource === "object" && imageSource?.character) {
      imgUrl = await getCharacterImage(imageSource.character);
    } else if (typeof imageSource === "object" && imageSource?.enemy) {
      imgUrl = await getEnemyImage(imageSource.enemy);
    }
  } catch { /* fall through to fallback */ }

  if (!imgUrl) imgUrl = NARUTO_IMAGES.profile;

  try {
    return await sock.sendMessage(jid, { image: { url: imgUrl }, caption }, { quoted: msg });
  } catch {
    return sock.sendMessage(jid, { text: caption }, { quoted: msg });
  }
}
