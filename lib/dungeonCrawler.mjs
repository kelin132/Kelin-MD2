/**
 * KELIN MD — Text Dungeon Crawler engine (v2)
 * Persistent character sheet (JSON file) + in-memory dungeon run state.
 * Adds: difficulty tiers, elite enemies, equipment, class skills, rebirth/prestige.
 */

import fs from "fs";
import path from "path";

const CHAR_PATH = path.resolve("./database/dungeonCharacters.json");

export const runs = new Map(); // jid -> active run state

export const CLASSES = {
  warrior: {
    label: "🛡 Warrior",
    maxHp: 120,
    atk: 14,
    def: 8,
    crit: 0.1,
    skillName: "Rage Strike",
    skillDesc: "1.8x damage + heal 10% max HP",
  },
  mage: {
    label: "🔮 Mage",
    maxHp: 80,
    atk: 20,
    def: 3,
    crit: 0.15,
    skillName: "Fireball",
    skillDesc: "1.5x damage that ignores enemy DEF",
  },
  rogue: {
    label: "🗡 Rogue",
    maxHp: 95,
    atk: 17,
    def: 5,
    crit: 0.25,
    skillName: "Backstab",
    skillDesc: "guaranteed critical hit (2.2x)",
  },
};

export const ROOMS_PER_RUN = 8;
export const REBIRTH_LEVEL = 10;
export const ELITE_CHANCE = 0.15;

export const DIFFICULTIES = {
  easy: { label: "😌 Easy", enemyMult: 0.75, rewardMult: 0.8 },
  normal: { label: "⚔️ Normal", enemyMult: 1, rewardMult: 1 },
  hard: { label: "🔥 Hard", enemyMult: 1.35, rewardMult: 1.6 },
  nightmare: { label: "💀 Nightmare", enemyMult: 1.8, rewardMult: 2.3 },
};

/* ── Character persistence ────────────────────────────────────────────── */
function loadChars() {
  if (!fs.existsSync(CHAR_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CHAR_PATH, "utf8") || "{}");
  } catch {
    return {};
  }
}
function saveChars(all) {
  try {
    fs.mkdirSync(path.dirname(CHAR_PATH), { recursive: true });
    fs.writeFileSync(CHAR_PATH, JSON.stringify(all, null, 2));
  } catch {
    /* best-effort */
  }
}

export function getCharacter(jid) {
  return loadChars()[jid] || null;
}

export function createCharacter(jid, name, classKey) {
  const cls = CLASSES[classKey];
  if (!cls) return { ok: false, reason: "bad-class" };
  const all = loadChars();
  if (all[jid]) return { ok: false, reason: "exists" };

  const character = {
    name,
    class: classKey,
    level: 1,
    xp: 0,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    atk: cls.atk,
    def: cls.def,
    crit: cls.crit,
    gold: 20,
    potions: 2,
    inventory: [], // { id, name, slot: "weapon"|"armor", bonus, rarity }
    weapon: null,
    armor: null,
    prestige: 0,
    roomsCleared: 0,
    deaths: 0,
    createdAt: Date.now(),
  };
  all[jid] = character;
  saveChars(all);
  return { ok: true, character };
}

export function saveCharacter(jid, character) {
  const all = loadChars();
  all[jid] = character;
  saveChars(all);
}

/** Effective stats = base + equipped gear + prestige bonus. */
export function effectiveStats(character) {
  const prestigeMult = 1 + character.prestige * 0.05;
  const atk = Math.round((character.atk + (character.weapon?.bonus || 0)) * prestigeMult);
  const def = Math.round((character.def + (character.armor?.bonus || 0)) * prestigeMult);
  return { atk, def };
}

export function xpNeeded(level) {
  return 50 * level;
}

function applyLevelUps(character) {
  const levelsGained = [];
  while (character.xp >= xpNeeded(character.level)) {
    character.xp -= xpNeeded(character.level);
    character.level += 1;
    character.maxHp += 10;
    character.atk += 2;
    character.def += 1;
    character.hp = character.maxHp; // full heal on level up
    levelsGained.push(character.level);
  }
  return levelsGained;
}

/* ── Rebirth / prestige ───────────────────────────────────────────────── */
export function rebirth(jid) {
  const character = getCharacter(jid);
  if (!character) return { ok: false, reason: "no-character" };
  if (character.level < REBIRTH_LEVEL) return { ok: false, reason: "level-too-low" };

  const cls = CLASSES[character.class];
  character.prestige += 1;
  character.level = 1;
  character.xp = 0;
  character.maxHp = cls.maxHp;
  character.hp = cls.maxHp;
  character.atk = cls.atk;
  character.def = cls.def;
  saveCharacter(jid, character);
  return { ok: true, character };
}

/* ── Enemy generation ─────────────────────────────────────────────────── */
const ENEMY_NAMES = ["Cave Rat", "Skeleton", "Goblin", "Giant Spider", "Bandit", "Shade", "Ogre", "Wraith"];
const BOSS_NAMES = ["The Bone King", "Molten Behemoth", "The Hollow Warden", "Ancient Wyrm"];

export function generateEnemy(roomNumber, isBoss, difficultyKey = "normal") {
  const diff = DIFFICULTIES[difficultyKey] || DIFFICULTIES.normal;
  const scale = roomNumber;
  const isElite = !isBoss && Math.random() < ELITE_CHANCE;
  const eliteMult = isElite ? 1.6 : 1;

  if (isBoss) {
    const hp = Math.round((60 + scale * 18) * diff.enemyMult);
    return {
      name: BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)],
      isBoss: true,
      isElite: false,
      hp,
      maxHp: hp,
      atk: Math.round((10 + scale * 3) * diff.enemyMult),
      def: Math.round((4 + scale * 1.2) * diff.enemyMult),
      xp: Math.round((40 + scale * 12) * diff.rewardMult),
      gold: Math.round((30 + scale * 10) * diff.rewardMult),
    };
  }

  const hp = Math.round((18 + scale * 7) * diff.enemyMult * eliteMult);
  return {
    name: (isElite ? "⚡ Elite " : "") + ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
    isBoss: false,
    isElite,
    hp,
    maxHp: hp,
    atk: Math.round((4 + scale * 2) * diff.enemyMult * eliteMult),
    def: Math.round(scale * 0.8 * diff.enemyMult * eliteMult),
    xp: Math.round((8 + scale * 4) * diff.rewardMult * (isElite ? 1.8 : 1)),
    gold: Math.round((5 + scale * 3) * diff.rewardMult * (isElite ? 1.8 : 1)),
  };
}

/* ── Loot ──────────────────────────────────────────────────────────────── */
const WEAPON_NAMES = {
  Common: "Iron Sword",
  Rare: "Steel Cleaver",
  Epic: "Enchanted Blade",
};
const ARMOR_NAMES = {
  Common: "Leather Vest",
  Rare: "Chainmail",
  Epic: "Runic Plate",
};

function rollGearRarity(roomNumber) {
  const roll = Math.random() + roomNumber * 0.02;
  if (roll > 0.93) return "Epic";
  if (roll > 0.7) return "Rare";
  return "Common";
}
const GEAR_BONUS = { Common: 2, Rare: 5, Epic: 9 };

export function rollLoot(character, roomNumber) {
  const roll = Math.random();
  if (roll < 0.3) {
    const potions = 1;
    character.potions += potions;
    return { type: "potion", label: `🧪 Healing Potion x${potions}` };
  }
  if (roll < 0.55) {
    const goldRoll = 10 + Math.floor(Math.random() * 20) + roomNumber * 3;
    character.gold += goldRoll;
    return { type: "gold", label: `💰 Gold Pouch (+$${goldRoll})`, amount: goldRoll };
  }
  const slot = roll < 0.775 ? "weapon" : "armor";
  const rarity = rollGearRarity(roomNumber);
  const bonus = GEAR_BONUS[rarity];
  const item = {
    id: `${slot}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: (slot === "weapon" ? WEAPON_NAMES[rarity] : ARMOR_NAMES[rarity]),
    slot,
    bonus,
    rarity,
  };
  character.inventory.push(item);
  return { type: "gear", label: `${slot === "weapon" ? "⚔️" : "🛡"} ${item.name} (${rarity}, +${bonus} ${slot === "weapon" ? "ATK" : "DEF"}) — use *.rpg equip*`, item };
}

export function equipItem(jid, itemId) {
  const character = getCharacter(jid);
  if (!character) return { ok: false, reason: "no-character" };
  const idx = character.inventory.findIndex((i) => i.id === itemId || i.name.toLowerCase() === String(itemId).toLowerCase());
  if (idx === -1) return { ok: false, reason: "not-found" };
  const item = character.inventory[idx];
  character.inventory.splice(idx, 1);
  const old = character[item.slot];
  character[item.slot] = item;
  if (old) character.inventory.push(old); // swap old gear back into inventory
  saveCharacter(jid, character);
  return { ok: true, equipped: item, replaced: old || null };
}

/* ── Events ────────────────────────────────────────────────────────────── */
const EVENTS = [
  {
    text: "A wounded traveler asks for help crossing a chasm.",
    options: [
      { label: "Help them across (safe, small reward)", risky: false },
      { label: "Take the risky shortcut instead (bigger reward, chance of harm)", risky: true },
    ],
  },
  {
    text: "You find a shimmering fountain. Drink from it?",
    options: [
      { label: "Drink cautiously (safe, small heal)", risky: false },
      { label: "Drink deeply (could be a big heal — or poison)", risky: true },
    ],
  },
  {
    text: "A locked chest sits behind old runes.",
    options: [
      { label: "Walk away (safe, nothing happens)", risky: false },
      { label: "Force it open (chance of good loot or a trap)", risky: true },
    ],
  },
];

export function generateEvent() {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

/** Resolve a chosen event option. Returns an outcome to show/apply. */
function resolveEventChoice(character, option) {
  if (!option.risky) {
    // safe branch — small guaranteed upside
    const roll = Math.random();
    if (roll < 0.5) {
      const heal = Math.round(character.maxHp * 0.15);
      character.hp = Math.min(character.maxHp, character.hp + heal);
      return { outcome: "heal", amount: heal, text: `You feel a little better. (+${heal} HP)` };
    }
    const gold = 10 + Math.floor(Math.random() * 15);
    character.gold += gold;
    return { outcome: "gold", amount: gold, text: `You're rewarded with gold. (+$${gold})` };
  }
  // risky branch — bigger swing either way
  const roll = Math.random();
  if (roll < 0.4) {
    const dmg = Math.max(1, Math.round(character.maxHp * 0.2));
    character.hp = Math.max(0, character.hp - dmg);
    return { outcome: "damage", amount: dmg, text: `It backfires! (-${dmg} HP)` };
  }
  if (roll < 0.75) {
    const gold = 30 + Math.floor(Math.random() * 50);
    character.gold += gold;
    return { outcome: "gold", amount: gold, text: `Jackpot! (+$${gold})` };
  }
  const heal = Math.round(character.maxHp * 0.4);
  character.hp = Math.min(character.maxHp, character.hp + heal);
  return { outcome: "heal", amount: heal, text: `A huge stroke of luck. (+${heal} HP)` };
}

export function resolveEvent(jid, choiceIndex) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || !run.pendingEvent || !character) return { ok: false, reason: "no-event" };
  const option = run.pendingEvent.options[choiceIndex];
  if (!option) return { ok: false, reason: "bad-choice" };

  const result = resolveEventChoice(character, option);
  saveCharacter(jid, character);
  run.pendingEvent = null;
  character.roomsCleared += 1;
  saveCharacter(jid, character);
  return { ok: true, ...result };
}

/* ── Merchant ──────────────────────────────────────────────────────────── */
export function generateMerchantOffer(roomNumber) {
  const roll = Math.random();
  if (roll < 0.4) {
    return { type: "potion", label: "🧪 Healing Potion", price: 15 + roomNumber * 2 };
  }
  const slot = roll < 0.7 ? "weapon" : "armor";
  const rarity = rollGearRarity(roomNumber);
  const bonus = GEAR_BONUS[rarity];
  const name = slot === "weapon" ? WEAPON_NAMES[rarity] : ARMOR_NAMES[rarity];
  const price = Math.round(bonus * 12 + roomNumber * 4);
  return {
    type: "gear",
    slot,
    rarity,
    label: `${slot === "weapon" ? "⚔️" : "🛡"} ${name} (${rarity}, +${bonus} ${slot === "weapon" ? "ATK" : "DEF"})`,
    price,
    bonus,
    name,
  };
}

export function buyMerchantOffer(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || !run.merchantOffer || !character) return { ok: false, reason: "no-offer" };
  const offer = run.merchantOffer;
  if (character.gold < offer.price) return { ok: false, reason: "too-poor" };

  character.gold -= offer.price;
  if (offer.type === "potion") {
    character.potions += 1;
  } else {
    character.inventory.push({
      id: `${offer.slot}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: offer.name,
      slot: offer.slot,
      bonus: offer.bonus,
      rarity: offer.rarity,
    });
  }
  saveCharacter(jid, character);
  run.merchantOffer = null;
  return { ok: true, offer };
}

/* ── Room generation ──────────────────────────────────────────────────── */
export function nextRoomType(roomNumber) {
  if (roomNumber === ROOMS_PER_RUN) return "boss";
  const roll = Math.random();
  if (roll < 0.42) return "enemy";
  if (roll < 0.6) return "treasure";
  if (roll < 0.72) return "rest";
  if (roll < 0.82) return "trap";
  if (roll < 0.92) return "merchant";
  return "event";
}

/* ── Run lifecycle ────────────────────────────────────────────────────── */
export function startRun(jid, difficultyKey = "normal") {
  const character = getCharacter(jid);
  if (!character) return { ok: false, reason: "no-character" };
  if (runs.has(jid)) return { ok: false, reason: "already-running" };
  if (!DIFFICULTIES[difficultyKey]) return { ok: false, reason: "bad-difficulty" };
  if (character.hp <= 0) character.hp = character.maxHp;

  const run = {
    jid,
    room: 0,
    status: "exploring", // exploring | battle | ended
    enemy: null,
    difficulty: difficultyKey,
    skillUsed: false,
    xpGained: 0,
    goldGained: 0,
    merchantOffer: null,
    pendingEvent: null,
  };
  runs.set(jid, run);
  return { ok: true, run, character };
}

export function getRun(jid) {
  return runs.get(jid) || null;
}

export function abandonRun(jid) {
  const had = runs.delete(jid);
  return { ok: had };
}

export function advanceRoom(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || !character) return { ok: false, reason: "no-run" };
  if (run.status === "battle") return { ok: false, reason: "in-battle" };
  if (run.pendingEvent) return { ok: false, reason: "pending-event" };

  run.merchantOffer = null; // any unbought offer is left behind when moving on
  run.room += 1;
  const isBoss = run.room === ROOMS_PER_RUN;
  const type = isBoss ? "boss" : nextRoomType(run.room);

  if (type === "enemy" || type === "boss") {
    run.enemy = generateEnemy(run.room, isBoss, run.difficulty);
    run.status = "battle";
    run.skillUsed = false;
    return { ok: true, type, enemy: run.enemy, room: run.room };
  }

  if (type === "treasure") {
    const loot = rollLoot(character, run.room);
    character.roomsCleared += 1;
    if (loot.type === "gold") run.goldGained += loot.amount;
    saveCharacter(jid, character);
    return { ok: true, type, loot, room: run.room };
  }

  if (type === "merchant") {
    run.merchantOffer = generateMerchantOffer(run.room);
    return { ok: true, type, offer: run.merchantOffer, room: run.room };
  }

  if (type === "event") {
    run.pendingEvent = generateEvent();
    return { ok: true, type, event: run.pendingEvent, room: run.room };
  }

  if (type === "rest") {
    const healed = Math.min(character.maxHp - character.hp, Math.round(character.maxHp * 0.3));
    character.hp += healed;
    character.roomsCleared += 1;
    saveCharacter(jid, character);
    return { ok: true, type, healed, room: run.room };
  }

  // trap
  const { def } = effectiveStats(character);
  const dmg = Math.max(1, Math.round(character.maxHp * 0.12) - def);
  character.hp = Math.max(0, character.hp - dmg);
  character.roomsCleared += 1;
  saveCharacter(jid, character);
  if (character.hp <= 0) {
    return endRun(jid, false, { type: "trap", dmg, room: run.room });
  }
  return { ok: true, type, dmg, room: run.room };
}

function rollDamage(atk, def, critChance, critMult = 1.8) {
  const variance = Math.floor(Math.random() * 5) - 2; // -2..2
  const isCrit = Math.random() < critChance;
  let dmg = Math.max(1, atk - def + variance);
  if (isCrit) dmg = Math.round(dmg * critMult);
  return { dmg, isCrit };
}

function enemyCounterAttack(jid, run, character) {
  const { def } = effectiveStats(character);
  const enemyHit = rollDamage(run.enemy.atk, def, 0.05);
  character.hp = Math.max(0, character.hp - enemyHit.dmg);
  saveCharacter(jid, character);
  return enemyHit;
}

export function attack(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || run.status !== "battle" || !character) return { ok: false, reason: "no-battle" };

  const { atk, def } = effectiveStats(character);
  const enemy = run.enemy;
  const playerHit = rollDamage(atk, enemy.def, character.crit);
  enemy.hp = Math.max(0, enemy.hp - playerHit.dmg);

  if (enemy.hp <= 0) {
    return resolveVictory(jid, run, character, playerHit);
  }

  const enemyHit = enemyCounterAttack(jid, run, character);

  if (character.hp <= 0) {
    return { ok: true, victory: false, playerHit, enemyHit, playerDied: true, ...endRun(jid, false, { room: run.room }) };
  }

  return { ok: true, victory: false, playerHit, enemyHit, playerDied: false, enemyHp: enemy.hp, playerHp: character.hp };
}

export function useSkill(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || run.status !== "battle" || !character) return { ok: false, reason: "no-battle" };
  if (run.skillUsed) return { ok: false, reason: "already-used" };

  const { atk, def } = effectiveStats(character);
  const enemy = run.enemy;
  run.skillUsed = true;
  let playerHit;
  let extra = {};

  if (character.class === "warrior") {
    const variance = Math.floor(Math.random() * 5) - 2;
    const dmg = Math.max(1, Math.round(atk * 1.8) - enemy.def + variance);
    playerHit = { dmg, isCrit: false, skill: true };
    const heal = Math.round(character.maxHp * 0.1);
    character.hp = Math.min(character.maxHp, character.hp + heal);
    extra.healed = heal;
  } else if (character.class === "mage") {
    const variance = Math.floor(Math.random() * 5) - 2;
    const dmg = Math.max(1, Math.round(atk * 1.5) + variance); // ignores def
    playerHit = { dmg, isCrit: false, skill: true };
  } else {
    // rogue — guaranteed crit
    const variance = Math.floor(Math.random() * 5) - 2;
    const base = Math.max(1, atk - enemy.def + variance);
    playerHit = { dmg: Math.round(base * 2.2), isCrit: true, skill: true };
  }

  enemy.hp = Math.max(0, enemy.hp - playerHit.dmg);
  saveCharacter(jid, character);

  if (enemy.hp <= 0) {
    return { ...resolveVictory(jid, run, character, playerHit), ...extra };
  }

  const enemyHit = enemyCounterAttack(jid, run, character);
  if (character.hp <= 0) {
    return { ok: true, victory: false, playerHit, enemyHit, playerDied: true, ...extra, ...endRun(jid, false, { room: run.room }) };
  }
  return { ok: true, victory: false, playerHit, enemyHit, playerDied: false, enemyHp: enemy.hp, playerHp: character.hp, ...extra };
}

function resolveVictory(jid, run, character, playerHit) {
  const enemy = run.enemy;
  character.xp += enemy.xp;
  character.gold += enemy.gold;
  character.roomsCleared += 1;
  run.xpGained += enemy.xp;
  run.goldGained += enemy.gold;
  const levelsGained = applyLevelUps(character);
  saveCharacter(jid, character);
  run.status = "exploring";
  run.enemy = null;
  const win = {
    ok: true,
    victory: true,
    playerHit,
    enemyDefeated: true,
    xpGained: enemy.xp,
    goldGained: enemy.gold,
    levelsGained,
    isBoss: enemy.isBoss,
    isElite: enemy.isElite,
    room: run.room,
  };
  if (enemy.isBoss) {
    return { ...win, ...endRun(jid, true, { boss: true, xpGainedTotal: run.xpGained, goldGainedTotal: run.goldGained }) };
  }
  return win;
}

export function flee(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || run.status !== "battle" || !character) return { ok: false, reason: "no-battle" };
  const success = Math.random() < 0.5;
  if (success) {
    run.status = "ended";
    runs.delete(jid);
    return { ok: true, success: true };
  }
  const enemyHit = enemyCounterAttack(jid, run, character);
  if (character.hp <= 0) {
    return { ok: true, success: false, enemyHit, ...endRun(jid, false, { room: run.room }) };
  }
  return { ok: true, success: false, enemyHit, playerHp: character.hp };
}

export function usePotion(jid) {
  const character = getCharacter(jid);
  if (!character) return { ok: false, reason: "no-character" };
  if (character.potions <= 0) return { ok: false, reason: "no-potions" };
  if (character.hp >= character.maxHp) return { ok: false, reason: "full-hp" };
  character.potions -= 1;
  const healed = Math.min(character.maxHp - character.hp, Math.round(character.maxHp * 0.4));
  character.hp += healed;
  saveCharacter(jid, character);
  return { ok: true, healed, hp: character.hp, potions: character.potions };
}

export function endRun(jid, success, meta = {}) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  const roomsCleared = run ? run.room : 0;
  if (run) {
    meta.xpGainedTotal = meta.xpGainedTotal ?? run.xpGained;
    meta.goldGainedTotal = meta.goldGainedTotal ?? run.goldGained;
  }

  if (!success && character) {
    const goldLost = Math.round(character.gold * 0.15);
    character.gold = Math.max(0, character.gold - goldLost);
    character.deaths += 1;
    saveCharacter(jid, character);
    meta.goldLost = goldLost;
  }

  runs.delete(jid);
  return { ok: true, ended: true, success, roomsCleared, ...meta };
}

export function topCharacters(limit = 10) {
  const all = loadChars();
  return Object.entries(all)
    .map(([jid, c]) => ({ jid, ...c }))
    .sort((a, b) => b.prestige - a.prestige || b.level - a.level || b.gold - a.gold)
    .slice(0, limit);
}
