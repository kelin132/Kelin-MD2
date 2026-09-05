/**
 * KELIN MD — DBZ game logic (lib/dbz/gameLogic.mjs)
 * Moves, damage formula, Ki system, XP rewards.
 */

// ── In-battle Ki constants ─────────────────────────────────────────────────────
export const MAX_BATTLE_KI  = 300;
export const KI_REGEN_TURN  = 20;   // Ki restored each turn
export const KI_GUARD_BONUS = 30;   // Extra Ki gained when guarding

// ── Move definitions ──────────────────────────────────────────────────────────
export const DBZ_MOVES = {
  punch: {
    id: "punch", name: "Punch",
    cost: 0, power: 45, type: "physical",
    desc: "A quick physical strike. No Ki required.",
    emoji: "👊",
  },
  kick: {
    id: "kick", name: "Kick",
    cost: 0, power: 50, type: "physical",
    desc: "A swift, precise kick. No Ki required.",
    emoji: "🦵",
  },
  ki_blast: {
    id: "ki_blast", name: "Ki Blast",
    cost: 20, power: 75, type: "energy",
    desc: "A focused ball of energy. Costs 20 Ki.",
    emoji: "💠",
  },
  special: {
    id: "special", name: "Special Attack",
    cost: 50, power: 120, type: "energy",
    desc: "Your character's signature move. Costs 50 Ki.",
    emoji: "⚡",
  },
  guard: {
    id: "guard", name: "Guard",
    cost: 0, power: 0, type: "defense",
    desc: "Brace for impact. Halves incoming damage and gains +30 Ki.",
    emoji: "🛡️",
  },
  transform: {
    id: "transform", name: "Transform",
    cost: 30, power: 0, type: "special",
    desc: "Power up to the next form. Costs 30 Ki. Boosts all stats.",
    emoji: "🌟",
  },
  flee: {
    id: "flee", name: "Flee",
    cost: 0, power: 0, type: "flee",
    desc: "Escape from the battle.",
    emoji: "🏃",
  },
};

/** The ordered move list shown to the player in battle. */
export const BATTLE_MOVE_LIST = [
  DBZ_MOVES.punch,
  DBZ_MOVES.kick,
  DBZ_MOVES.ki_blast,
  DBZ_MOVES.special,
  DBZ_MOVES.guard,
  DBZ_MOVES.transform,
];

// ── Damage calculation ─────────────────────────────────────────────────────────
/**
 * Calculate damage dealt by attacker's move against defender.
 * Uses the same Gen-3-style formula as the Pokémon system.
 */
export function calcDamage(attacker, defender, move, isGuarding = false) {
  if (!move.power || move.power === 0) return 0;
  const level  = attacker.level  || 5;
  const atk    = attacker.attack  || 10;
  const def    = defender.defense || 10;
  const power  = move.power;
  const base   = ((2 * level / 5 + 2) * power * atk / def) / 50 + 2;
  const roll   = 0.85 + Math.random() * 0.15;
  let dmg      = Math.max(1, Math.floor(base * roll));
  if (isGuarding) dmg = Math.max(1, Math.floor(dmg * 0.5));
  return dmg;
}

/** Decide if a move is a critical hit (~6.25% chance). */
export function isCriticalHit() {
  return Math.random() < 0.0625;
}

// ── Ki management ─────────────────────────────────────────────────────────────

/** Regenerate Ki for a fighter at the start of their turn. */
export function regenKi(fighter) {
  const newKi = Math.min(fighter.maxKi || MAX_BATTLE_KI, (fighter.ki || 0) + KI_REGEN_TURN);
  return { ...fighter, ki: newKi };
}

/** Deduct Ki cost from a fighter. Returns null if not enough Ki. */
export function spendKi(fighter, cost) {
  if ((fighter.ki || 0) < cost) return null;
  return { ...fighter, ki: Math.max(0, (fighter.ki || 0) - cost) };
}

// ── Transformation ────────────────────────────────────────────────────────────
/**
 * Apply the next transformation to a fighter.
 * Returns the updated fighter or null if no forms left.
 */
export function applyTransform(fighter) {
  const forms  = fighter.forms || [];
  const nextIdx = (fighter.currentFormIndex || 0) + 1;
  if (nextIdx > forms.length) return null; // no more forms

  const form = forms[nextIdx - 1]; // 0-indexed
  const mult = form.statMultiplier || 1.3;

  return {
    ...fighter,
    currentFormIndex: nextIdx,
    imageUrl:   form.imageUrl || fighter.imageUrl,
    auraColor:  form.auraColor || "#ffdd00",
    currentFormName: form.name,
    // Apply stat multiplier on top of base stats
    attack:  Math.floor(fighter.attack  * mult),
    defense: Math.floor(fighter.defense * mult),
    speed:   Math.floor(fighter.speed   * mult),
    maxHp:   Math.floor(fighter.maxHp   * mult),
    hp:      Math.min(fighter.hp, Math.floor(fighter.maxHp * mult)),
    transformed: true,
  };
}

// ── Villain level scaling ──────────────────────────────────────────────────────
/** Same function as wildLevel() — level near the average player level. */
export function villainLevel(baseLevel = 5) {
  const base = Math.max(1, baseLevel);
  const min  = Math.max(1, base - 3);
  const max  = base + 5;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Scale base stats to a villain level (mirrors pokemonDb.mjs scaleStats). */
export function scaleStatsToLevel(baseStats, level) {
  const scale = (v) => Math.max(5, Math.floor(v * (1 + level * 0.05)));
  return {
    hp:      scale(baseStats.baseHp),
    maxHp:   scale(baseStats.baseHp),
    attack:  scale(baseStats.baseAttack),
    defense: scale(baseStats.baseDefense),
    speed:   scale(baseStats.baseSpeed),
    maxKi:   MAX_BATTLE_KI,
    ki:      MAX_BATTLE_KI,
  };
}

// ── XP & reward formulas ──────────────────────────────────────────────────────
export function xpRewardVillain(villainLevel) {
  return Math.floor(villainLevel * 110 + Math.random() * 80 + 40);
}

export function pvpXpReward(winnerFighter, defeatedFighter) {
  const dl  = Math.max(1, Math.min(100, Number(defeatedFighter?.level) || 1));
  const wl  = Math.max(1, Math.min(100, Number(winnerFighter?.level)   || 1));
  const base = 200 + dl * 90 + dl * dl * 6;
  const bonus = Math.max(0, dl - wl) * 200;
  return Math.floor(base + bonus + Math.random() * Math.max(40, base * 0.1));
}

export function zeniReward(level) {
  return Math.floor(level * 35 + Math.random() * 50 + 15);
}

// ── XP level up ───────────────────────────────────────────────────────────────
export function getXpNeeded(level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  return Math.floor(70 + l * 18 + 7 * Math.pow(l, 1.8));
}
