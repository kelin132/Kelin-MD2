// lib/dragonball/utils.js — Battle utilities for DBZ system

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

export function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

export function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.25));
}

/**
 * Calculate battle damage (DBZ style — power level scaling).
 */
export function calculateDamage(attacker, defender, technique = null) {
  const base = attacker.attack + (technique?.damage || 0);
  const mitigation = Math.floor(defender.defense * 0.45);
  let dmg = Math.max(1, Math.floor(base - mitigation));
  // 12% critical hit chance — "CRITICAL HIT!"
  if (chance(12)) dmg = Math.floor(dmg * 1.85);
  // Random variance ±15%
  const variance = 1 + (Math.random() * 0.3 - 0.15);
  return Math.max(1, Math.round(dmg * variance));
}

/**
 * HP bar using colored squares (Pokémon style).
 */
export function healthBar(current, max, size = 10) {
  const pct = max > 0 ? current / max : 0;
  const filled = Math.min(size, Math.max(0, Math.round(pct * size)));
  const color = pct > 0.5 ? "🟧" : pct > 0.25 ? "🟨" : "🟥";
  return color.repeat(filled) + "⬜".repeat(size - filled);
}

/**
 * KI bar using blue squares.
 */
export function kiBar(current, max, size = 8) {
  const filled = max > 0 ? Math.min(size, Math.max(0, Math.round((current / max) * size))) : 0;
  return "🟦".repeat(filled) + "⬜".repeat(size - filled);
}

/**
 * Get the DBZ rank name for a given level.
 */
export function getRankName(level) {
  if (level >= 160) return "God of Destruction";
  if (level >= 120) return "Super Saiyan God";
  if (level >= 85)  return "Super Saiyan 3";
  if (level >= 60)  return "Super Saiyan 2";
  if (level >= 40)  return "Super Saiyan";
  if (level >= 25)  return "Elite Warrior";
  if (level >= 10)  return "Z Fighter";
  return "Earthling";
}

/**
 * Dramatic Pokémon-style attack messages.
 */
export function getAttackMessage(attackerName, targetName, damage, isCrit = false) {
  const basic = [
    `👊 *${attackerName}* STRIKES with full power!`,
    `💢 *${attackerName}* launches a furious physical assault!`,
    `⚡ *${attackerName}* rushes in at blinding speed!`,
    `🔥 *${attackerName}* unleashes a devastating blow!`,
    `💥 *${attackerName}* charges forward with raw power!`,
  ];
  const critLines = [
    `💢💢 A *CRITICAL HIT*! The ground shatters beneath ${targetName}!`,
    `⭐ *SUPER EFFECTIVE!* ${targetName} staggers from the impact!`,
    `🌟 *CRITICAL!* ${attackerName} found the perfect opening!`,
  ];
  const msg = random(basic);
  const suffix = isCrit ? `\n${random(critLines)}` : "";
  return `${msg}\n💫 *${targetName}* takes *${damage} damage*!${suffix}`;
}

/**
 * Dramatic technique hit messages.
 */
export function getTechniqueMessage(attackerName, techniqueName, targetName, damage, isCrit = false) {
  const openers = {
    "Kamehameha":         `🌊 *KA-ME-HA-ME-HA!!!*\n🌊 *${attackerName}* fires a massive blue energy wave!`,
    "Final Flash":        `⚡ *FINAL... FLASH!!!*\n⚡ *${attackerName}* unleashes a blinding golden beam!`,
    "Galick Gun":         `💜 *GALICK GUN!!!*\n💜 *${attackerName}* fires a devastating purple blast!`,
    "Spirit Bomb":        `✨ *SPIRIT BOMB!!!*\n✨ *${attackerName}* gathers energy from all living things!`,
    "Special Beam Cannon":`💚 *SPECIAL BEAM CANNON!!!*\n💚 *${attackerName}*'s drill beam pierces through!`,
    "Destructo Disc":     `🔵 *DESTRUCTO DISC!!!*\n🔵 *${attackerName}* hurls a razor-sharp energy ring!`,
    "Big Bang Attack":    `🔴 *BIG BANG ATTACK!!!*\n🔴 *${attackerName}* launches a condensed energy sphere!`,
    "Solar Flare":        `☀️ *SOLAR FLARE!!!*\n☀️ *${attackerName}* blinds ${targetName} with blinding light!`,
    "Tri-Beam":           `🔺 *TRI-BEAM!!!*\n🔺 *${attackerName}* channels energy into a devastating triangle!`,
    "Death Ball":         `☄️ *DEATH BALL!!!*\n☄️ *${attackerName}* launches a planet-destroying sphere!`,
    "Hellzone Grenade":   `💚 *HELLZONE GRENADE!!!*\n💚 *${attackerName}* surrounds the enemy with energy blasts!`,
    "Energy Shield":      `🛡️ *${attackerName}* generates an *Energy Shield*!\n🔵 Defense boosted this turn!`,
    "Self Destruct":      `💣 *${attackerName}* ignites their power cells!\n💣 *SELF DESTRUCT!!!*`,
    "Double Sunday":      `🟠 *DOUBLE SUNDAY!!!*\n🟠 *${attackerName}* fires twin energy blasts!`,
    "Renzoku Energy Dan": `⚡ *RENZOKU ENERGY DAN!!!*\n⚡ *${attackerName}* fires rapid ki blasts!`,
  };
  const opener = openers[techniqueName] || `🌀 *${techniqueName.toUpperCase()}!!!*\n🌀 *${attackerName}* unleashes their signature technique!`;
  const critLine = isCrit ? `\n⭐ *SUPER CRITICAL! ${targetName} is overwhelmed!*` : "";
  return `${opener}\n💥 *${targetName}* takes *${damage} damage*!${critLine}`;
}

/**
 * Villain spawn dramatic messages.
 */
export function getSpawnMessage(villainName, level) {
  const msgs = [
    `⚠️ *A VILLAIN HAS APPEARED!*\n🔴 *${villainName}* (Power Level ${level}) descends from above!\n💀 The air trembles with their dark energy!`,
    `🌑 *INCOMING THREAT!*\n👹 *${villainName}* (Lv ${level}) has arrived, hungry for battle!\n⚡ Their power level is extraordinary!`,
    `☠️ *ENEMY SPOTTED!*\n😈 *${villainName}* (Lv ${level}) stands before you!\n🔥 This villain means business!`,
    `🚨 *DANGER!*\n💀 *${villainName}* (Power Lv ${level}) has challenged you!\n💥 You must fight to survive!`,
  ];
  return random(msgs);
}
