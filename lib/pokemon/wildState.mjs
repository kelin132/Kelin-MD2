/**
 * KELIN MD — Wild Pokémon spawn state (in-memory, per chat)
 * A wild Pokémon can only appear in one group at a time.
 * State is cleared when caught, defeated, or expired (30 min).
 */

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// chatId → { pokemon, spawnedAt, spawnedBy, capturedBy }
const wilds = new Map();

export function getWild(chatId) {
  const entry = wilds.get(chatId);
  if (!entry) return null;
  if (Date.now() - entry.spawnedAt > EXPIRY_MS) {
    wilds.delete(chatId);
    return null;
  }
  return entry;
}

export function setWild(chatId, pokemon, spawnedBy = null) {
  wilds.set(chatId, {
    pokemon: { ...pokemon },
    spawnedAt: Date.now(),
    spawnedBy,
    capturedBy: null,
  });
}

export function clearWild(chatId) {
  wilds.delete(chatId);
}

export function updateWildHp(chatId, hp) {
  const entry = wilds.get(chatId);
  if (entry) {
    entry.pokemon.hp = Math.max(0, hp);
    wilds.set(chatId, entry);
  }
}

export function hasWild(chatId) {
  return !!getWild(chatId);
}
