const CACHE_TTL_MS = 10_000;
const MAX_ENTRIES = 5_000;
const entries = new Map();

/**
 * Returns `{ hit, value }` so a cached `null` (not AFK) is distinct from a
 * cache miss. Entries contain only the small AFK view, never a wallet snapshot.
 */
export function readAfkLookup(key, now = Date.now()) {
  const entry = entries.get(key);
  if (!entry) return { hit: false, value: null };
  if (entry.expiresAt <= now) {
    entries.delete(key);
    return { hit: false, value: null };
  }

  // Refresh insertion order to keep frequently active senders in the LRU set.
  entries.delete(key);
  entries.set(key, entry);
  return { hit: true, value: entry.value };
}

export function writeAfkLookup(key, value, now = Date.now()) {
  entries.delete(key);
  entries.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

export function invalidateAfkLookup(key) {
  entries.delete(key);
}

export function clearAfkLookupCache() {
  entries.clear();
}
