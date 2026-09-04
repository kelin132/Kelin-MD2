/**
 * Temporary Pokémon item effects that apply to a group.
 * These effects intentionally live in memory, like wild encounters and battles.
 */

const activeRepels = new Map();

export function setRepel(chatId, itemName, durationMs) {
  const expiresAt = Date.now() + durationMs;
  activeRepels.set(chatId, { itemName, expiresAt });
  return expiresAt;
}

export function getRepel(chatId) {
  const repel = activeRepels.get(chatId);
  if (!repel) return null;
  if (repel.expiresAt <= Date.now()) {
    activeRepels.delete(chatId);
    return null;
  }
  return repel;
}

export function clearRepel(chatId) {
  activeRepels.delete(chatId);
}