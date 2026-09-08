/**
 * KELIN MD — Text Dungeon Crawler engine
 * Persistent character sheet (JSON file) + in-memory dungeon run state.
 */

import fs from "fs";
import path from "path";

const CHAR_PATH = path.resolve("./database/dungeonCharacters.json");

export const runs = new Map(); // jid -> active run state

export const CLASSES = {
  warrior: { label: "🛡 Warrior", maxHp: 120, atk: 14, def: 8, crit: 0.1 },
  mage: { label: "🔮 Mage", maxHp: 80, atk: 20, def: 3, crit: 0.15 },
  rogue: { label: "🗡 Rogue", maxHp: 95, atk: 17, def: 5, crit: 0.25 },
};

export const ROOMS_PER_RUN = 8;

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
    inventory: [],
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

/* ── Enemy generation ─────────────────────────────────────────────────── */
const ENEMY_NAMES = ["Cave Rat", "Skeleton", "Goblin", "Giant Spider", "Bandit", "Shade", "Ogre", "Wraith"];
const BOSS_NAMES = ["The Bone King", "Molten Behemoth", "The Hollow Warden", "Ancient Wyrm"];

export function generateEnemy(roomNumber, isBoss) {
  const scale = roomNumber;
  if (isBoss) {
    return {
      name: BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)],
      isBoss: true,
      hp: 60 + scale * 18,
      maxHp: 60 + scale * 18,
      atk: 10 + scale * 3,
      def: 4 + Math.floor(scale * 1.2),
      xp: 40 + scale * 12,
      gold: 30 + scale * 10,
    };
  }
  return {
    name: ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)],
    isBoss: false,
    hp: 18 + scale * 7,
    maxHp: 18 + scale * 7,
    atk: 4 + scale * 2,
    def: Math.floor(scale * 0.8),
    xp: 8 + scale * 4,
    gold: 5 + scale * 3,
  };
}

const LOOT_POOL = [
  { type: "potion", label: "🧪 Healing Potion", apply: (c) => (c.potions += 1) },
  { type: "gold", label: "💰 Gold Pouch", apply: (c, roll) => (c.gold += roll) },
  { type: "atk", label: "⚔️ Whetstone (+1 ATK)", apply: (c) => (c.atk += 1) },
  { type: "def", label: "🛡 Scrap Armor (+1 DEF)", apply: (c) => (c.def += 1) },
];

export function rollLoot(character) {
  const loot = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
  const goldRoll = 10 + Math.floor(Math.random() * 20);
  loot.apply(character, goldRoll);
  return { label: loot.label, type: loot.type, amount: loot.type === "gold" ? goldRoll : 1 };
}

/* ── Room generation ──────────────────────────────────────────────────── */
export function nextRoomType(roomNumber) {
  if (roomNumber === ROOMS_PER_RUN) return "boss";
  const roll = Math.random();
  if (roll < 0.55) return "enemy";
  if (roll < 0.75) return "treasure";
  if (roll < 0.9) return "rest";
  return "trap";
}

/* ── Run lifecycle ────────────────────────────────────────────────────── */
export function startRun(jid) {
  const character = getCharacter(jid);
  if (!character) return { ok: false, reason: "no-character" };
  if (runs.has(jid)) return { ok: false, reason: "already-running" };
  if (character.hp <= 0) character.hp = character.maxHp;

  const run = {
    jid,
    room: 0,
    status: "exploring", // exploring | battle | ended
    enemy: null,
    log: [],
    xpGained: 0,
    goldGained: 0,
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

  run.room += 1;
  const isBoss = run.room === ROOMS_PER_RUN;
  const type = isBoss ? "boss" : nextRoomType(run.room);

  if (type === "enemy" || type === "boss") {
    run.enemy = generateEnemy(run.room, isBoss);
    run.status = "battle";
    return { ok: true, type, enemy: run.enemy, room: run.room };
  }

  if (type === "treasure") {
    const loot = rollLoot(character);
    character.roomsCleared += 1;
    if (loot.type === "gold") run.goldGained += loot.amount;
    saveCharacter(jid, character);
    return { ok: true, type, loot, room: run.room };
  }

  if (type === "rest") {
    const healed = Math.min(character.maxHp - character.hp, Math.round(character.maxHp * 0.3));
    character.hp += healed;
    character.roomsCleared += 1;
    saveCharacter(jid, character);
    return { ok: true, type, healed, room: run.room };
  }

  // trap
  const dmg = Math.max(1, Math.round(character.maxHp * 0.12) - character.def);
  character.hp = Math.max(0, character.hp - dmg);
  character.roomsCleared += 1;
  saveCharacter(jid, character);
  if (character.hp <= 0) {
    return endRun(jid, false, { type: "trap", dmg, room: run.room });
  }
  return { ok: true, type, dmg, room: run.room };
}

function rollDamage(atk, def, critChance) {
  const variance = Math.floor(Math.random() * 5) - 2; // -2..2
  const isCrit = Math.random() < critChance;
  let dmg = Math.max(1, atk - def + variance);
  if (isCrit) dmg = Math.round(dmg * 1.8);
  return { dmg, isCrit };
}

export function attack(jid) {
  const run = runs.get(jid);
  const character = getCharacter(jid);
  if (!run || run.status !== "battle" || !character) return { ok: false, reason: "no-battle" };

  const enemy = run.enemy;
  const playerHit = rollDamage(character.atk, enemy.def, character.crit);
  enemy.hp = Math.max(0, enemy.hp - playerHit.dmg);

  if (enemy.hp <= 0) {
    character.xp += enemy.xp;
    character.gold += enemy.gold;
    character.roomsCleared += 1;
    run.xpGained += enemy.xp;
    run.goldGained += enemy.gold;
    const levelsGained = applyLevelUps(character);
    saveCharacter(jid, character);
    run.status = "exploring";
    run.enemy = null;
    const win = { ok: true, victory: true, playerHit, enemyDefeated: true, xpGained: enemy.xp, goldGained: enemy.gold, levelsGained, isBoss: enemy.isBoss, room: run.room };
    if (enemy.isBoss) {
      return { ...win, ...endRun(jid, true, { boss: true, xpGainedTotal: run.xpGained, goldGainedTotal: run.goldGained }) };
    }
    return win;
  }

  const enemyHit = rollDamage(enemy.atk, character.def, 0.05);
  character.hp = Math.max(0, character.hp - enemyHit.dmg);
  saveCharacter(jid, character);

  if (character.hp <= 0) {
    return { ok: true, victory: false, playerHit, enemyHit, playerDied: true, ...endRun(jid, false, { room: run.room }) };
  }

  return { ok: true, victory: false, playerHit, enemyHit, playerDied: false, enemyHp: enemy.hp, playerHp: character.hp };
}

export function flee(jid) {
  const run = runs.get(jid);
  if (!run || run.status !== "battle") return { ok: false, reason: "no-battle" };
  const success = Math.random() < 0.5;
  if (success) {
    run.status = "ended";
    runs.delete(jid);
    return { ok: true, success: true };
  }
  const character = getCharacter(jid);
  const enemyHit = rollDamage(run.enemy.atk, character.def, 0.05);
  character.hp = Math.max(0, character.hp - enemyHit.dmg);
  saveCharacter(jid, character);
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
    .sort((a, b) => b.level - a.level || b.gold - a.gold)
    .slice(0, limit);
}
