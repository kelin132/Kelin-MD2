/**
 * KELIN MD — Wild Pokémon spawn state (in-memory, per chat)
 * A wild Pokémon can only appear in one group at a time.
 * State is cleared when caught, defeated, or expired (30 min).
 * When a Pokémon flees due to timeout, an optional onFlee callback is fired.
 */

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// chatId → { pokemon, spawnedAt, spawnedBy, capturedBy, fleeTimer }
const wilds = new Map();

/**
 * @param {string} chatId
 * @param {object} pokemon
 * @param {string|null} spawnedBy
 * @param {function|null} onFlee  — called with (pokemonName) when the 30-min timer fires
 */
export function setWild(chatId, pokemon, spawnedBy = null, onFlee = null) {
  // Cancel any existing flee timer for this chat
  const existing = wilds.get(chatId);
  if (existing?.fleeTimer) clearTimeout(existing.fleeTimer);

  const entry = {
    pokemon: { ...pokemon },
    spawnedAt: Date.now(),
    spawnedBy,
    capturedBy: null,
    fleeTimer: null,
  };

  // Schedule flee message
  if (typeof onFlee === "function") {
    entry.fleeTimer = setTimeout(() => {
      wilds.delete(chatId);
      try { onFlee(pokemon.displayName || pokemon.name); } catch {}
    }, EXPIRY_MS);
  }

  wilds.set(chatId, entry);
}

export function getWild(chatId) {
  const entry = wilds.get(chatId);
  if (!entry) return null;
  // Expired without a callback (legacy callers that didn't pass onFlee)
  if (Date.now() - entry.spawnedAt > EXPIRY_MS) {
    if (entry.fleeTimer) clearTimeout(entry.fleeTimer);
    wilds.delete(chatId);
    return null;
  }
  return entry;
}

export function clearWild(chatId) {
  const entry = wilds.get(chatId);
  if (entry?.fleeTimer) clearTimeout(entry.fleeTimer); // cancel the flee timer
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
