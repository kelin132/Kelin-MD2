import { getDb } from "./mongo.mjs";
import { resolveAccountIdentity, collectionOwnershipQuery } from "./accountIdentity.mjs";
import { shortRead, invalidateShortRead } from "./shortReadCache.mjs";
export { collectionOwnershipQuery } from "./accountIdentity.mjs";

const ACCOUNT_IDENTITY_CACHE_PREFIX = "collection-identities:";

export function collectionIdentityQuery(values, fields) {
  return { $or: fields.map((field) => ({ [field]: { $in: values } })) };
}

export async function accountIdentityValues(id) {
  const identity = String(id ?? "").trim();
  if (!identity) return [];

  return shortRead(`${ACCOUNT_IDENTITY_CACHE_PREFIX}${identity}`, async () => {
    // This is the same registered account resolver that economy getUser uses.
    const shared = await resolveAccountIdentity(getDb(), identity, null, { includeAccount: false });
    const strings = shared.ids;
    // Numeric phone keys are supported; bare LIDs require per-record evidence.
    return [...strings, ...strings.filter((key) => /^\d+$/.test(key))
      .map(Number).filter(Number.isSafeInteger)];
  });
}

export function invalidateAccountIdentityValues(id) {
  const identity = String(id ?? "").trim();
  if (identity) invalidateShortRead(`${ACCOUNT_IDENTITY_CACHE_PREFIX}${identity}`);
}

export async function trainerIdentityQuery(id) {
  return collectionOwnershipQuery(await accountIdentityValues(id),
    ["jid", "_id", "userId", "ownerJid"]);
}

export async function pokemonOwnershipQuery(id) {
  return collectionOwnershipQuery(await accountIdentityValues(id),
    ["ownerJid", "owner", "userId"]);
}
