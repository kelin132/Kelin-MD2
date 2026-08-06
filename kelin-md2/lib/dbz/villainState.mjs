/**
 * KELIN MD — DBZ Villain spawn state (in-memory, per chat)
 * Parallel to lib/pokemon/wildState.mjs
 *
 * Only one villain can be active per chat at a time.
 * Cleared when the villain is defeated, fled, or the timer expires.
 */

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// chatId → { villain, spawnedAt, fleeTimer }
const villains = new Map();

/**
 * @param {string} chatId
 * @param {object} villain  — scaled villain object (hp, maxHp, attack, etc.)
 * @param {function|null} onFlee  — called with (villainName) when timer fires
 */
export function setVillain(chatId, villain, onFlee = null) {
  // Cancel any existing flee timer for this chat
  const existing = villains.get(chatId);
  if (existing?.fleeTimer) clearTimeout(existing.fleeTimer);

  const entry = {
    villain: { ...villain },
    spawnedAt: Date.now(),
    fleeTimer: null,
  };

  if (typeof onFlee === "function") {
    entry.fleeTimer = setTimeout(() => {
      villains.delete(chatId);
      try { onFlee(villain.displayName || villain.name); } catch {}
    }, EXPIRY_MS);
  }

  villains.set(chatId, entry);
}

export function getVillain(chatId) {
  const entry = villains.get(chatId);
  if (!entry) return null;
  // Expired without a callback
  if (Date.now() - entry.spawnedAt > EXPIRY_MS) {
    if (entry.fleeTimer) clearTimeout(entry.fleeTimer);
    villains.delete(chatId);
    return null;
  }
  return entry;
}

export function clearVillain(chatId) {
  const entry = villains.get(chatId);
  if (entry?.fleeTimer) clearTimeout(entry.fleeTimer);
  villains.delete(chatId);
}

export function updateVillainHp(chatId, hp) {
  const entry = villains.get(chatId);
  if (entry) {
    entry.villain.hp = Math.max(0, hp);
    villains.set(chatId, entry);
  }
}

export function hasVillain(chatId) {
  return !!getVillain(chatId);
}
