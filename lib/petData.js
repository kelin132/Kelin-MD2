/**
 * KELIN MD — Pet System Data
 * All static species, rarities, evolutions, skills, and monsters.
 */

// ── Rarities ──────────────────────────────────────────────────────────────────
export const RARITIES = {
  common:    { label: "⚪ Common",    color: "⚪", weight: 45 },
  uncommon:  { label: "🟢 Uncommon",  color: "🟢", weight: 28 },
  rare:      { label: "🔵 Rare",      color: "🔵", weight: 15 },
  epic:      { label: "🟣 Epic",      color: "🟣", weight: 8  },
  legendary: { label: "🟡 Legendary", color: "🟡", weight: 3  },
  mythic:    { label: "🔴 Mythic",    color: "🔴", weight: 1  },
};

// nekos.best category used for image fetching
// https://nekos.best/api/v2/<category>
const IMG = {
  neko:   "neko",
  kitsune:"kitsune",
};

// ── Species ───────────────────────────────────────────────────────────────────
// evolChain: array of stages in order. Each entry: { name, minLevel, imgCat }
// stats: base values at level 1
export const PET_SPECIES = {
  // ── COMMON ─────────────────────────────────────────────────────────────────
  cat: {
    name: "Cat", rarity: "common", imgCat: IMG.neko,
    skill: "Scratch",
    stats: { hp: 80, attack: 12, defense: 10, speed: 14 },
    evolChain: [
      { name: "Cat",       minLevel: 1,  imgCat: IMG.neko    },
      { name: "Swift Cat", minLevel: 20, imgCat: IMG.neko    },
      { name: "Moon Cat",  minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  dog: {
    name: "Dog", rarity: "common", imgCat: IMG.neko,
    skill: "Bite",
    stats: { hp: 90, attack: 14, defense: 12, speed: 10 },
    evolChain: [
      { name: "Dog",      minLevel: 1,  imgCat: IMG.neko },
      { name: "Hound",    minLevel: 20, imgCat: IMG.neko },
      { name: "War Hound",minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  bunny: {
    name: "Bunny", rarity: "common", imgCat: IMG.neko,
    skill: "Quick Step",
    stats: { hp: 70, attack: 10, defense: 8, speed: 18 },
    evolChain: [
      { name: "Bunny",        minLevel: 1,  imgCat: IMG.neko    },
      { name: "Sakura Bunny", minLevel: 20, imgCat: IMG.neko    },
      { name: "Moon Rabbit",  minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  chicken: {
    name: "Chicken", rarity: "common", imgCat: IMG.neko,
    skill: "Peck",
    stats: { hp: 65, attack: 11, defense: 9, speed: 13 },
    evolChain: [
      { name: "Chicken",     minLevel: 1,  imgCat: IMG.neko },
      { name: "Rooster",     minLevel: 20, imgCat: IMG.neko },
      { name: "Flame Fowl",  minLevel: 45, imgCat: IMG.kitsune },
    ],
  },

  // ── UNCOMMON ───────────────────────────────────────────────────────────────
  fox: {
    name: "Fox", rarity: "uncommon", imgCat: IMG.kitsune,
    skill: "Fox Fire",
    stats: { hp: 85, attack: 16, defense: 12, speed: 17 },
    evolChain: [
      { name: "Fox",       minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Swift Fox", minLevel: 18, imgCat: IMG.kitsune },
      { name: "Frost Fox", minLevel: 40, imgCat: IMG.kitsune },
    ],
  },
  wolf: {
    name: "Wolf", rarity: "uncommon", imgCat: IMG.kitsune,
    skill: "Shadow Fang",
    stats: { hp: 95, attack: 18, defense: 14, speed: 15 },
    evolChain: [
      { name: "Wolf",        minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Dire Wolf",   minLevel: 15, imgCat: IMG.kitsune },
      { name: "Shadow Wolf", minLevel: 35, imgCat: IMG.kitsune },
      { name: "Fenrir",      minLevel: 60, imgCat: IMG.kitsune },
    ],
  },
  panda: {
    name: "Panda", rarity: "uncommon", imgCat: IMG.neko,
    skill: "Bamboo Strike",
    stats: { hp: 110, attack: 14, defense: 18, speed: 10 },
    evolChain: [
      { name: "Panda",      minLevel: 1,  imgCat: IMG.neko    },
      { name: "Jade Panda", minLevel: 18, imgCat: IMG.neko    },
      { name: "Storm Panda",minLevel: 40, imgCat: IMG.kitsune },
    ],
  },
  owl: {
    name: "Owl", rarity: "uncommon", imgCat: IMG.neko,
    skill: "Talon Strike",
    stats: { hp: 78, attack: 17, defense: 11, speed: 16 },
    evolChain: [
      { name: "Owl",       minLevel: 1,  imgCat: IMG.neko    },
      { name: "Night Owl", minLevel: 18, imgCat: IMG.neko    },
      { name: "Lunar Owl", minLevel: 40, imgCat: IMG.kitsune },
    ],
  },

  // ── RARE ───────────────────────────────────────────────────────────────────
  tiger: {
    name: "Tiger", rarity: "rare", imgCat: IMG.kitsune,
    skill: "Tiger Pounce",
    stats: { hp: 120, attack: 24, defense: 16, speed: 18 },
    evolChain: [
      { name: "Tiger",        minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Storm Tiger",  minLevel: 20, imgCat: IMG.kitsune },
      { name: "Thunder Tiger", minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  falcon: {
    name: "Falcon", rarity: "rare", imgCat: IMG.neko,
    skill: "Dive Bomb",
    stats: { hp: 90, attack: 22, defense: 12, speed: 26 },
    evolChain: [
      { name: "Falcon",      minLevel: 1,  imgCat: IMG.neko    },
      { name: "Sky Falcon",  minLevel: 20, imgCat: IMG.neko    },
      { name: "Storm Eagle", minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  shark: {
    name: "Shark", rarity: "rare", imgCat: IMG.neko,
    skill: "Frenzy Bite",
    stats: { hp: 130, attack: 26, defense: 14, speed: 14 },
    evolChain: [
      { name: "Shark",       minLevel: 1,  imgCat: IMG.neko    },
      { name: "Great Shark", minLevel: 20, imgCat: IMG.neko    },
      { name: "Leviathan Jr",minLevel: 45, imgCat: IMG.kitsune },
    ],
  },
  bear: {
    name: "Bear", rarity: "rare", imgCat: IMG.neko,
    skill: "Maul",
    stats: { hp: 145, attack: 20, defense: 22, speed: 10 },
    evolChain: [
      { name: "Bear",       minLevel: 1,  imgCat: IMG.neko    },
      { name: "Polar Bear", minLevel: 20, imgCat: IMG.neko    },
      { name: "Glacial Bear",minLevel: 45, imgCat: IMG.kitsune },
    ],
  },

  // ── EPIC ───────────────────────────────────────────────────────────────────
  kitsune: {
    name: "Kitsune", rarity: "epic", imgCat: IMG.kitsune,
    skill: "Spirit Flame",
    stats: { hp: 140, attack: 30, defense: 22, speed: 28 },
    evolChain: [
      { name: "Kitsune",      minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Nine Tails Jr",minLevel: 25, imgCat: IMG.kitsune },
    ],
  },
  phoenix_chick: {
    name: "Phoenix Chick", rarity: "epic", imgCat: IMG.kitsune,
    skill: "Ember Wing",
    stats: { hp: 130, attack: 28, defense: 18, speed: 26 },
    evolChain: [
      { name: "Phoenix Chick",   minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Young Phoenix",   minLevel: 25, imgCat: IMG.kitsune },
      { name: "Divine Phoenix",  minLevel: 55, imgCat: IMG.kitsune },
    ],
  },
  baby_dragon: {
    name: "Baby Dragon", rarity: "epic", imgCat: IMG.kitsune,
    skill: "Dragon Breath",
    stats: { hp: 160, attack: 32, defense: 24, speed: 20 },
    evolChain: [
      { name: "Baby Dragon",  minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Young Dragon", minLevel: 25, imgCat: IMG.kitsune },
      { name: "Dragon",       minLevel: 55, imgCat: IMG.kitsune },
    ],
  },
  griffin: {
    name: "Griffin", rarity: "epic", imgCat: IMG.kitsune,
    skill: "Wind Slash",
    stats: { hp: 150, attack: 29, defense: 20, speed: 25 },
    evolChain: [
      { name: "Griffin",     minLevel: 1,  imgCat: IMG.kitsune },
      { name: "War Griffin", minLevel: 25, imgCat: IMG.kitsune },
    ],
  },

  // ── LEGENDARY ──────────────────────────────────────────────────────────────
  nine_tailed_fox: {
    name: "Nine-Tailed Fox", rarity: "legendary", imgCat: IMG.kitsune,
    skill: "Nine Flame Burst",
    stats: { hp: 200, attack: 42, defense: 30, speed: 35 },
    evolChain: [
      { name: "Nine-Tailed Fox",    minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Celestial Nine-Tail", minLevel: 40, imgCat: IMG.kitsune },
    ],
  },
  kirin: {
    name: "Kirin", rarity: "legendary", imgCat: IMG.kitsune,
    skill: "Thunder Horn",
    stats: { hp: 210, attack: 38, defense: 36, speed: 30 },
    evolChain: [
      { name: "Kirin",        minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Sacred Kirin", minLevel: 40, imgCat: IMG.kitsune },
    ],
  },
  cerberus: {
    name: "Cerberus", rarity: "legendary", imgCat: IMG.kitsune,
    skill: "Hellfire Howl",
    stats: { hp: 230, attack: 40, defense: 32, speed: 28 },
    evolChain: [
      { name: "Cerberus",      minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Hellborn Cerberus", minLevel: 40, imgCat: IMG.kitsune },
    ],
  },

  // ── MYTHIC ─────────────────────────────────────────────────────────────────
  leviathan: {
    name: "Leviathan", rarity: "mythic", imgCat: IMG.kitsune,
    skill: "Tidal Apocalypse",
    stats: { hp: 320, attack: 60, defense: 48, speed: 30 },
    evolChain: [
      { name: "Leviathan", minLevel: 1, imgCat: IMG.kitsune },
    ],
  },
  bahamut: {
    name: "Bahamut", rarity: "mythic", imgCat: IMG.kitsune,
    skill: "Mega Flare",
    stats: { hp: 350, attack: 65, defense: 45, speed: 32 },
    evolChain: [
      { name: "Bahamut", minLevel: 1, imgCat: IMG.kitsune },
    ],
  },
  shadow_dragon: {
    name: "Shadow Dragon", rarity: "mythic", imgCat: IMG.kitsune,
    skill: "Void Annihilation",
    stats: { hp: 340, attack: 68, defense: 42, speed: 35 },
    evolChain: [
      { name: "Shadow Dragon",  minLevel: 1,  imgCat: IMG.kitsune },
      { name: "Abyss Dragon",   minLevel: 50, imgCat: IMG.kitsune },
    ],
  },
};

// ── Rarity pool for egg hatching ──────────────────────────────────────────────
export const RARITY_POOL = {
  common:    ["cat", "dog", "bunny", "chicken"],
  uncommon:  ["fox", "wolf", "panda", "owl"],
  rare:      ["tiger", "falcon", "shark", "bear"],
  epic:      ["kitsune", "phoenix_chick", "baby_dragon", "griffin"],
  legendary: ["nine_tailed_fox", "kirin", "cerberus"],
  mythic:    ["leviathan", "bahamut", "shadow_dragon"],
};

// ── PvE monsters for .petbattle ───────────────────────────────────────────────
export const MONSTERS = [
  { name: "Forest Slime",    emoji: "🟢", hpMult: 0.8,  atkMult: 0.7,  reward: { exp: 30,  gold: 20  } },
  { name: "Stone Golem",     emoji: "🪨", hpMult: 1.4,  atkMult: 0.8,  reward: { exp: 50,  gold: 35  } },
  { name: "Fire Sprite",     emoji: "🔥", hpMult: 0.9,  atkMult: 1.1,  reward: { exp: 60,  gold: 40  } },
  { name: "Dark Wolf",       emoji: "🐺", hpMult: 1.0,  atkMult: 1.0,  reward: { exp: 55,  gold: 38  } },
  { name: "Shadow Bat",      emoji: "🦇", hpMult: 0.7,  atkMult: 1.2,  reward: { exp: 65,  gold: 45  } },
  { name: "Thunder Drake",   emoji: "⚡", hpMult: 1.2,  atkMult: 1.1,  reward: { exp: 80,  gold: 55  } },
  { name: "Ice Wraith",      emoji: "❄️", hpMult: 1.0,  atkMult: 1.3,  reward: { exp: 90,  gold: 60  } },
  { name: "Undead Knight",   emoji: "💀", hpMult: 1.5,  atkMult: 1.0,  reward: { exp: 95,  gold: 65  } },
  { name: "Void Serpent",    emoji: "🌑", hpMult: 1.3,  atkMult: 1.4,  reward: { exp: 110, gold: 80  } },
  { name: "Ancient Guardian",emoji: "🗿", hpMult: 2.0,  atkMult: 1.2,  reward: { exp: 140, gold: 100 } },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Roll a random rarity based on weights. */
export function rollRarity() {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const [key, r] of Object.entries(RARITIES)) {
    roll -= r.weight;
    if (roll <= 0) return key;
  }
  return "common";
}

/** Pick a random species for a given rarity. */
export function pickSpecies(rarity) {
  const pool = RARITY_POOL[rarity] || RARITY_POOL.common;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Compute scaled stats for a pet at a given level. */
export function scaledStats(speciesKey, level) {
  const sp = PET_SPECIES[speciesKey];
  if (!sp) return { hp: 100, attack: 10, defense: 10, speed: 10 };
  const mult = 1 + (level - 1) * 0.08;
  return {
    hp:      Math.floor(sp.stats.hp      * mult),
    attack:  Math.floor(sp.stats.attack  * mult),
    defense: Math.floor(sp.stats.defense * mult),
    speed:   Math.floor(sp.stats.speed   * mult),
  };
}

/** EXP needed to reach next level from current level. */
export function expForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.3));
}

/** Get the current evolution stage data for a pet at a given level. */
export function currentEvolStage(speciesKey, level) {
  const sp = PET_SPECIES[speciesKey];
  if (!sp) return null;
  let stage = sp.evolChain[0];
  for (const s of sp.evolChain) {
    if (level >= s.minLevel) stage = s;
  }
  return stage;
}

/** Get next evolution stage (null if maxed). */
export function nextEvolStage(speciesKey, level) {
  const sp = PET_SPECIES[speciesKey];
  if (!sp) return null;
  for (const s of sp.evolChain) {
    if (level < s.minLevel) return s;
  }
  return null;
}
