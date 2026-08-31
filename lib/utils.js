// lib/naruto/utils.js

export function random(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chance(percent) {
  return Math.random() * 100 < percent;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatNumber(number) {
  return new Intl.NumberFormat().format(number);
}

export function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.2));
}

export function calculateDamage(attacker, defender, skill) {
  const attack = attacker.attack;
  const defense = defender.defense;

  let damage =
    attack +
    (skill?.damage || 0) -
    defense / 2;

  damage = Math.max(1, Math.floor(damage));

  // 10% critical hit
  if (chance(10)) {
    damage *= 2;
  }

  return damage;
}

export function healthBar(current, max, size = 10) {
  const filled = Math.round((current / max) * size);

  return "🟩".repeat(filled) + "⬜".repeat(size - filled);
}

export function chakraBar(current, max, size = 10) {
  const filled = Math.round((current / max) * size);

  return "🟦".repeat(filled) + "⬜".repeat(size - filled);
}