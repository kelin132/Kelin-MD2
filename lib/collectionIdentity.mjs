import { getDb } from "./mongo.mjs";
import { findUserByIdentity, whatsappIdentityVariants } from "./identity.mjs";
import { resolveAccountIdentity } from "./accountIdentity.mjs";

const ACCOUNT_FIELDS = [
  "_id", "userId", "jid", "whatsappNumber", "phoneNumber", "phone",
  "whatsappId", "whatsappJid", "userJid", "sender", "owner", "migratedFrom",
];

function variants(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  // ObjectIds and application IDs must not become invented phone numbers.
  return /^\+?\d+(?::\d+)?(?:@(s\.whatsapp\.net|c\.us|lid))?$/i.test(text)
    ? whatsappIdentityVariants(text) : [text];
}

function recordValues(record) {
  if (!record) return [];
  return [
    ...ACCOUNT_FIELDS.flatMap((field) => variants(record[field])),
    ...(Array.isArray(record.identityAliases) ? record.identityAliases.flatMap(variants) : []),
  ];
}

export function collectionIdentityQuery(values, fields) {
  return { $or: fields.map((field) => ({ [field]: { $in: values } })) };
}

export async function accountIdentityValues(id) {
  // This is the same registered account resolver that economy getUser uses.
  const account = await findUserByIdentity(id);
  const shared = await resolveAccountIdentity(getDb(), id);
  const keys = [...new Set([...variants(id), ...recordValues(account), ...shared.ids])];
  if (!keys.length) return [];
  const linked = await getDb().collection("users").find(
    collectionIdentityQuery(keys, [...ACCOUNT_FIELDS, "identityAliases"]),
    { projection: Object.fromEntries([...ACCOUNT_FIELDS, "identityAliases"].map((field) => [field, 1])) },
  ).toArray();
  const strings = [...new Set([...keys, ...linked.flatMap(recordValues)])];
  // Some legacy collections stored a bare phone/LID as a BSON number.
  return [...strings, ...strings.filter((key) => /^\d+$/.test(key))
    .map(Number).filter(Number.isSafeInteger)];
}

export async function trainerIdentityQuery(id) {
  return collectionIdentityQuery(await accountIdentityValues(id),
    ["jid", "_id", "userId", "ownerJid", "whatsappNumber", "identityAliases"]);
}

export async function pokemonOwnershipQuery(id) {
  return collectionIdentityQuery(await accountIdentityValues(id),
    ["ownerJid", "owner", "userId", "whatsappNumber"]);
}
