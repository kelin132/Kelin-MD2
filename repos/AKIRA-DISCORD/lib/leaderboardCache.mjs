const DEFAULT_TTL_MS = 30_000;
const cache = new Map();

export async function getCachedLeaderboard(key, loader, ttlMs = DEFAULT_TTL_MS) {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const pending = Promise.resolve().then(loader);
  cache.set(key, {
    value: pending,
    expiresAt: now + ttlMs,
  });

  try {
    const value = await pending;
    const current = cache.get(key);
    if (current?.value === pending) {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
    return value;
  } catch (error) {
    if (cache.get(key)?.value === pending) cache.delete(key);
    throw error;
  }
}