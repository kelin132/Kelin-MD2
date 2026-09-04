/**
 * Shared Mongo identity helpers.
 *
 * Kelin-MD2 uses the WhatsApp JID as users._id. Discord uses a namespaced
 * string key and a discordId field so both bots can safely share collections
 * without colliding with one another.
 */

export function normalizePlatformId(value) {
  return String(value ?? "").trim();
}

export function discordAccountKey(discordId) {
  return `discord:${normalizePlatformId(discordId)}`;
}

export function identityQuery(id, isDiscord = false) {
  const normalized = normalizePlatformId(id);
  if (!isDiscord) return { _id: normalized };

  return {
    $or: [
      { discordId: normalized },
      { _id: discordAccountKey(normalized) },
    ],
  };
}

export function identityInsertFields(id, isDiscord = false) {
  const normalized = normalizePlatformId(id);
  return isDiscord
    ? { _id: discordAccountKey(normalized), discordId: normalized }
    : { _id: normalized };
}
