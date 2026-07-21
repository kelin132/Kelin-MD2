/**
 * KELIN MD — Pet System Data
 * All static species, rarities, evolutions, skills, and monsters.
 * Each species has a fixed defaultImage from nekos.best so every pet
 * of the same species always shows the correct consistent image.
 */

// ── Rarities ──────────────────────────────────────────────────────────────────
export const RARITIES = {
  common:    { label: "⚪ Common",    color: "⚪", weight: 40 },
  uncommon:  { label: "🟢 Uncommon",  color: "🟢", weight: 28 },
  rare:      { label: "🔵 Rare",      color: "🔵", weight: 18 },
  epic:      { label: "🟣 Epic",      color: "🟣", weight: 9  },
  legendary: { label: "🟡 Legendary", color: "🟡", weight: 4  },
  mythic:    { label: "🔴 Mythic",    color: "🔴", weight: 1  },
};

// ── Species ───────────────────────────────────────────────────────────────────
// defaultImage: fixed nekos.best URL — one per species for consistency
// evolChain: stages in order — { name, minLevel, image? }
// stats: base values at level 1
export const PET_SPECIES = {

  // ── COMMON ─────────────────────────────────────────────────────────────────

  cat: {
    name: "Cat", rarity: "common",
    defaultImage: "https://nekos.best/api/v2/neko/429fec52-770b-43b0-a4fc-3b11e3803919.png",
    skill: "Scratch",
    stats: { hp: 80, attack: 12, defense: 10, speed: 14 },
    evolChain: [
      { name: "Cat",       minLevel: 1  },
      { name: "Swift Cat", minLevel: 20 },
      { name: "Moon Cat",  minLevel: 45, image: "https://nekos.best/api/v2/neko/8807c738-65e9-4d6e-87b6-f270106f3e14.png" },
    ],
  },

  dog: {
    name: "Dog", rarity: "common",
    defaultImage: "https://nekos.best/api/v2/neko/c4ed4c4b-d2a0-4bed-9cd3-a0dc7019e9d7.png",
    skill: "Bite",
    stats: { hp: 90, attack: 14, defense: 12, speed: 10 },
    evolChain: [
      { name: "Dog",       minLevel: 1  },
      { name: "Hound",     minLevel: 20 },
      { name: "War Hound", minLevel: 45 },
    ],
  },

  bunny: {
    name: "Bunny", rarity: "common",
    defaultImage: "https://nekos.best/api/v2/neko/f0f1af20-53fe-4eba-b07e-18a343a6b03a.png",
    skill: "Quick Step",
    stats: { hp: 70, attack: 10, defense: 8, speed: 18 },
    evolChain: [
      { name: "Bunny",        minLevel: 1  },
      { name: "Sakura Bunny", minLevel: 20, image: "https://nekos.best/api/v2/neko/536f3760-7e09-4f71-8669-7d02ea9f6010.png" },
      { name: "Moon Rabbit",  minLevel: 45 },
    ],
  },

  chicken: {
    name: "Chicken", rarity: "common",
    defaultImage: "https://nekos.best/api/v2/neko/e39871e2-1ce3-4203-8a37-aad6d6d622e1.png",
    skill: "Peck",
    stats: { hp: 65, attack: 11, defense: 9, speed: 13 },
    evolChain: [
      { name: "Chicken",   minLevel: 1  },
      { name: "Rooster",   minLevel: 20 },
      { name: "Flame Fowl",minLevel: 45 },
    ],
  },

  // ── UNCOMMON ───────────────────────────────────────────────────────────────

  fox: {
    name: "Fox", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/kitsune/739daea8-7d53-4093-b73e-103acd546e57.png",
    skill: "Fox Fire",
    stats: { hp: 85, attack: 16, defense: 12, speed: 17 },
    evolChain: [
      { name: "Fox",        minLevel: 1  },
      { name: "Swift Fox",  minLevel: 18 },
      { name: "Frost Fox",  minLevel: 40, image: "https://nekos.best/api/v2/kitsune/1a4d8ea7-cc50-44f3-80fa-a4c1614d6efb.png" },
    ],
  },

  wolf: {
    name: "Wolf", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/kitsune/ac0943db-ce33-4011-b127-667b57d7d97a.png",
    skill: "Shadow Fang",
    stats: { hp: 95, attack: 18, defense: 14, speed: 15 },
    evolChain: [
      { name: "Wolf",        minLevel: 1  },
      { name: "Dire Wolf",   minLevel: 15 },
      { name: "Shadow Wolf", minLevel: 35, image: "https://nekos.best/api/v2/kitsune/01ddd3f1-ed0b-477e-a3f7-c62ba5341fdc.png" },
      { name: "Fenrir",      minLevel: 60, image: "https://nekos.best/api/v2/kitsune/cc73a3bd-3a0a-407d-be96-b3ff6ea8559d.png" },
    ],
  },

  panda: {
    name: "Panda", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/neko/d72f8833-8acb-4a2d-8e38-3b49f09e5e82.png",
    skill: "Bamboo Strike",
    stats: { hp: 110, attack: 14, defense: 18, speed: 10 },
    evolChain: [
      { name: "Panda",       minLevel: 1  },
      { name: "Jade Panda",  minLevel: 18 },
      { name: "Storm Panda", minLevel: 40 },
    ],
  },

  owl: {
    name: "Owl", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/neko/6c82302d-ccf7-422f-a2a1-590627eeb20d.png",
    skill: "Talon Strike",
    stats: { hp: 78, attack: 17, defense: 11, speed: 16 },
    evolChain: [
      { name: "Owl",       minLevel: 1  },
      { name: "Night Owl", minLevel: 18 },
      { name: "Lunar Owl", minLevel: 40 },
    ],
  },

  moon_cat: {
    name: "Moon Cat", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/neko/8807c738-65e9-4d6e-87b6-f270106f3e14.png",
    skill: "Moonbeam",
    stats: { hp: 82, attack: 15, defense: 13, speed: 19 },
    evolChain: [
      { name: "Moon Cat",      minLevel: 1  },
      { name: "Lunar Cat",     minLevel: 20 },
      { name: "Celestial Neko",minLevel: 45 },
    ],
  },

  sakura_bunny: {
    name: "Sakura Bunny", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/neko/536f3760-7e09-4f71-8669-7d02ea9f6010.png",
    skill: "Petal Storm",
    stats: { hp: 72, attack: 13, defense: 10, speed: 20 },
    evolChain: [
      { name: "Sakura Bunny", minLevel: 1  },
      { name: "Blossom Hare", minLevel: 20 },
      { name: "Moon Rabbit",  minLevel: 45 },
    ],
  },

  fire_slime: {
    name: "Fire Slime", rarity: "uncommon",
    defaultImage: "https://nekos.best/api/v2/neko/ae31c375-cb11-42e8-bb94-cca44050f6d4.png",
    skill: "Ember Burst",
    stats: { hp: 88, attack: 19, defense: 9, speed: 14 },
    evolChain: [
      { name: "Fire Slime",   minLevel: 1  },
      { name: "Magma Slime",  minLevel: 18 },
      { name: "Inferno Core", minLevel: 40 },
    ],
  },

  // ── RARE ───────────────────────────────────────────────────────────────────

  tiger: {
    name: "Tiger", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/b38de80b-25b5-45fc-a758-c174234898d6.png",
    skill: "Tiger Pounce",
    stats: { hp: 120, attack: 24, defense: 16, speed: 18 },
    evolChain: [
      { name: "Tiger",         minLevel: 1  },
      { name: "Storm Tiger",   minLevel: 20 },
      { name: "Thunder Tiger", minLevel: 45 },
    ],
  },

  falcon: {
    name: "Falcon", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/neko/4ac79643-a21a-48f8-90f7-cf7cbca70417.png",
    skill: "Dive Bomb",
    stats: { hp: 90, attack: 22, defense: 12, speed: 26 },
    evolChain: [
      { name: "Falcon",       minLevel: 1  },
      { name: "Sky Falcon",   minLevel: 20 },
      { name: "Storm Eagle",  minLevel: 45 },
    ],
  },

  shark: {
    name: "Shark", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/faf115a0-24d5-4c52-83fe-6e3b8ca8d1ce.png",
    skill: "Frenzy Bite",
    stats: { hp: 130, attack: 26, defense: 14, speed: 14 },
    evolChain: [
      { name: "Shark",        minLevel: 1  },
      { name: "Great Shark",  minLevel: 20 },
      { name: "Leviathan Jr", minLevel: 45 },
    ],
  },

  bear: {
    name: "Bear", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/63a074d4-65a9-47e9-b2d5-cded0daaa9da.png",
    skill: "Maul",
    stats: { hp: 145, attack: 20, defense: 22, speed: 10 },
    evolChain: [
      { name: "Bear",        minLevel: 1  },
      { name: "Polar Bear",  minLevel: 20 },
      { name: "Glacial Bear",minLevel: 45 },
    ],
  },

  spirit_wolf: {
    name: "Spirit Wolf", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/01ddd3f1-ed0b-477e-a3f7-c62ba5341fdc.png",
    skill: "Soul Howl",
    stats: { hp: 115, attack: 25, defense: 15, speed: 22 },
    evolChain: [
      { name: "Spirit Wolf",  minLevel: 1  },
      { name: "Phantom Wolf", minLevel: 22 },
      { name: "Void Fenrir",  minLevel: 50, image: "https://nekos.best/api/v2/kitsune/e876bed1-f828-4aa2-91ab-dac04810fff2.png" },
    ],
  },

  thunder_fox: {
    name: "Thunder Fox", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/cc73a3bd-3a0a-407d-be96-b3ff6ea8559d.png",
    skill: "Lightning Dash",
    stats: { hp: 100, attack: 28, defense: 12, speed: 28 },
    evolChain: [
      { name: "Thunder Fox",    minLevel: 1  },
      { name: "Storm Fox",      minLevel: 22 },
      { name: "Tempest Kitsune",minLevel: 50, image: "https://nekos.best/api/v2/kitsune/755910dc-3558-4199-bbf0-cae15baf92c0.png" },
    ],
  },

  frost_wolf: {
    name: "Frost Wolf", rarity: "rare",
    defaultImage: "https://nekos.best/api/v2/kitsune/1a4d8ea7-cc50-44f3-80fa-a4c1614d6efb.png",
    skill: "Blizzard Fang",
    stats: { hp: 118, attack: 23, defense: 20, speed: 16 },
    evolChain: [
      { name: "Frost Wolf",  minLevel: 1  },
      { name: "Glacial Wolf",minLevel: 22 },
      { name: "Ice Fenrir",  minLevel: 50, image: "https://nekos.best/api/v2/kitsune/81992724-ed7b-4ae5-98ab-8770e1d6d57e.png" },
    ],
  },

  // ── EPIC ───────────────────────────────────────────────────────────────────

  kitsune: {
    name: "Kitsune", rarity: "epic",
    defaultImage: "https://nekos.best/api/v2/kitsune/2bdfb4ae-f9da-4656-b2a7-976a3cd4261e.png",
    skill: "Spirit Flame",
    stats: { hp: 140, attack: 30, defense: 22, speed: 28 },
    evolChain: [
      { name: "Kitsune",       minLevel: 1  },
      { name: "Nine Tails Jr", minLevel: 25, image: "https://nekos.best/api/v2/kitsune/af8acd04-3608-4f8f-ae9b-cb33190ede51.png" },
    ],
  },

  phoenix_chick: {
    name: "Phoenix Chick", rarity: "epic",
    defaultImage: "https://nekos.best/api/v2/kitsune/43ba917b-e2a8-4ee6-83fd-3b507f4ed54b.png",
    skill: "Ember Wing",
    stats: { hp: 130, attack: 28, defense: 18, speed: 26 },
    evolChain: [
      { name: "Phoenix Chick",  minLevel: 1  },
      { name: "Young Phoenix",  minLevel: 25, image: "https://nekos.best/api/v2/kitsune/15a596e7-201b-40ce-abbc-90fa13774573.png" },
      { name: "Divine Phoenix", minLevel: 55, image: "https://nekos.best/api/v2/kitsune/e491b1ef-37ca-4f5f-82c3-249e20777dad.png" },
    ],
  },

  baby_dragon: {
    name: "Baby Dragon", rarity: "epic",
    defaultImage: "https://nekos.best/api/v2/kitsune/a4504795-42a3-40f4-b939-0a7b66fee5ef.png",
    skill: "Dragon Breath",
    stats: { hp: 160, attack: 32, defense: 24, speed: 20 },
    evolChain: [
      { name: "Baby Dragon",  minLevel: 1  },
      { name: "Young Dragon", minLevel: 25, image: "https://nekos.best/api/v2/kitsune/5b44de0d-2d3e-4d58-9418-4544e81fe7cf.png" },
      { name: "Dragon",       minLevel: 55, image: "https://nekos.best/api/v2/kitsune/e876bed1-f828-4aa2-91ab-dac04810fff2.png" },
    ],
  },

  griffin: {
    name: "Griffin", rarity: "epic",
    defaultImage: "https://nekos.best/api/v2/kitsune/799fcd01-0499-40c7-a596-935a21cb4291.png",
    skill: "Wind Slash",
    stats: { hp: 150, attack: 29, defense: 20, speed: 25 },
    evolChain: [
      { name: "Griffin",     minLevel: 1  },
      { name: "War Griffin", minLevel: 25, image: "https://nekos.best/api/v2/kitsune/af8acd04-3608-4f8f-ae9b-cb33190ede51.png" },
    ],
  },

  // ── LEGENDARY ──────────────────────────────────────────────────────────────

  nine_tailed_fox: {
    name: "Nine-Tailed Fox", rarity: "legendary",
    defaultImage: "https://nekos.best/api/v2/kitsune/755910dc-3558-4199-bbf0-cae15baf92c0.png",
    skill: "Nine Flame Burst",
    stats: { hp: 200, attack: 42, defense: 30, speed: 35 },
    evolChain: [
      { name: "Nine-Tailed Fox",     minLevel: 1  },
      { name: "Celestial Nine-Tail", minLevel: 40, image: "https://nekos.best/api/v2/kitsune/15a596e7-201b-40ce-abbc-90fa13774573.png" },
    ],
  },

  kirin: {
    name: "Kirin", rarity: "legendary",
    defaultImage: "https://nekos.best/api/v2/kitsune/81992724-ed7b-4ae5-98ab-8770e1d6d57e.png",
    skill: "Thunder Horn",
    stats: { hp: 210, attack: 38, defense: 36, speed: 30 },
    evolChain: [
      { name: "Kirin",        minLevel: 1  },
      { name: "Sacred Kirin", minLevel: 40, image: "https://nekos.best/api/v2/kitsune/e491b1ef-37ca-4f5f-82c3-249e20777dad.png" },
    ],
  },

  cerberus: {
    name: "Cerberus", rarity: "legendary",
    defaultImage: "https://nekos.best/api/v2/kitsune/51bc7731-755e-4892-8eb3-a432fe394b8d.png",
    skill: "Hellfire Howl",
    stats: { hp: 230, attack: 40, defense: 32, speed: 28 },
    evolChain: [
      { name: "Cerberus",          minLevel: 1  },
      { name: "Hellborn Cerberus", minLevel: 40, image: "https://nekos.best/api/v2/kitsune/af8acd04-3608-4f8f-ae9b-cb33190ede51.png" },
    ],
  },

  // ── MYTHIC ─────────────────────────────────────────────────────────────────

  leviathan: {
    name: "Leviathan", rarity: "mythic",
    defaultImage: "https://nekos.best/api/v2/kitsune/e491b1ef-37ca-4f5f-82c3-249e20777dad.png",
    skill: "Tidal Apocalypse",
    stats: { hp: 320, attack: 60, defense: 48, speed: 30 },
    evolChain: [
      { name: "Leviathan", minLevel: 1 },
    ],
  },

  bahamut: {
    name: "Bahamut", rarity: "mythic",
    defaultImage: "https://nekos.best/api/v2/kitsune/5b44de0d-2d3e-4d58-9418-4544e81fe7cf.png",
    skill: "Mega Flare",
    stats: { hp: 350, attack: 65, defense: 45, speed: 32 },
    evolChain: [
      { name: "Bahamut", minLevel: 1 },
    ],
  },

  shadow_dragon: {
    name: "Shadow Dragon", rarity: "mythic",
    defaultImage: "https://nekos.best/api/v2/kitsune/e876bed1-f828-4aa2-91ab-dac04810fff2.png",
    skill: "Void Annihilation",
    stats: { hp: 340, attack: 68, defense: 42, speed: 35 },
    evolChain: [
      { name: "Shadow Dragon", minLevel: 1  },
      { name: "Abyss Dragon",  minLevel: 50, image: "https://nekos.best/api/v2/kitsune/af8acd04-3608-4f8f-ae9b-cb33190ede51.png" },
    ],
  },
};

// ── Rarity pool for egg hatching ──────────────────────────────────────────────
export const RARITY_POOL = {
  common:    ["cat", "dog", "bunny", "chicken"],
  uncommon:  ["fox", "wolf", "panda", "owl", "moon_cat", "sakura_bunny", "fire_slime"],
  rare:      ["tiger", "falcon", "shark", "bear", "spirit_wolf", "thunder_fox", "frost_wolf"],
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

/**
 * Get the image URL for a pet at its current level.
 * Uses the evolution stage's specific image if defined,
 * otherwise falls back to the species defaultImage.
 */
export function getSpeciesImage(speciesKey, level) {
  const sp    = PET_SPECIES[speciesKey];
  if (!sp) return null;
  const stage = currentEvolStage(speciesKey, level);
  return stage?.image || sp.defaultImage || null;
}
