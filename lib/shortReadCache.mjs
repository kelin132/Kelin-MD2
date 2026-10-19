const SHORT_READ_TTL_MS = 2_000;
const MAX_ENTRIES = 2_048;
const values = new Map();
const pending = new Map();
const generations = new Map();

export function invalidateShortRead(key) {
  const normalized = String(key ?? "");
  values.delete(normalized);
  pending.delete(normalized);
  generations.set(normalized, (generations.get(normalized) || 0) + 1);
}

export async function shortRead(key, loader) {
  const normalized = String(key ?? "");
  const cached = values.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) values.delete(normalized);
  if (pending.has(normalized)) return pending.get(normalized);

  const generation = generations.get(normalized) || 0;
  let request;
  request = Promise.resolve().then(loader).then((value) => {
    if ((generations.get(normalized) || 0) === generation) {
      values.set(normalized, { value, expiresAt: Date.now() + SHORT_READ_TTL_MS });
      while (values.size > MAX_ENTRIES) values.delete(values.keys().next().value);
    }
    return value;
  }).finally(() => {
    if (pending.get(normalized) === request) pending.delete(normalized);
  });
  pending.set(normalized, request);
  return request;
}
