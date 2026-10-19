import { getDb } from "./mongo.mjs";
import { resolveAccountIdentity, collectionOwnershipQuery } from "./accountIdentity.mjs";
export { collectionOwnershipQuery } from "./accountIdentity.mjs";

export function collectionIdentityQuery(values, fields) {
  return { $or: fields.map((field) => ({ [field]: { $in: values } })) };
}

export async function accountIdentityValues(id) {
  // This is the same registered account resolver that economy getUser uses.
  const shared = await resolveAccountIdentity(getDb(), id);
  const strings = shared.ids;
  // Numeric phone keys are supported; bare LIDs require per-record evidence.
  return [...strings, ...strings.filter((key) => /^\d+$/.test(key))
    .map(Number).filter(Number.isSafeInteger)];
}

export async function trainerIdentityQuery(id) {
  return collectionOwnershipQuery(await accountIdentityValues(id),
    ["jid", "_id", "userId", "ownerJid"]);
}

export async function pokemonOwnershipQuery(id) {
  return collectionOwnershipQuery(await accountIdentityValues(id),
    ["ownerJid", "owner", "userId"]);
}
