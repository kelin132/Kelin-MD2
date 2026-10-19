export const ID_FIELDS = ["_id", "userId", "jid", "whatsappNumber", "phoneNumber", "phone", "whatsappId", "whatsappJid", "userJid", "migratedFrom"];

export function identityVariants(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  if (raw.startsWith("discord:")) return [raw];
  const match = raw.match(/^\+?(\d+)(?::\d+)?(?:@(s\.whatsapp\.net|c\.us|lid))?$/i);
  if (!match) return [raw];
  const [, local, server] = match;
  // A LID's local digits are not a phone-number alias. Treating them as one
  // can attach a different player's bare-number legacy data to this account.
  if (server?.toLowerCase() === "lid") return [raw, `${local}@lid`];
  if (server || (local.length >= 7 && local.length <= 15)) return [raw, local, `+${local}`, `${local}@s.whatsapp.net`, `${local}@c.us`, `${local}:0@s.whatsapp.net`];
  return [raw];
}

function canonicalWhatsAppId(value) {
  const variants = identityVariants(value);
  return variants.find(id => id.endsWith("@s.whatsapp.net"))
    || variants.find(id => id.endsWith("@lid"))
    || String(value ?? "").trim();
}

function unambiguousActiveLinks(links, sender) {
  const usable = links.filter(link => link?.whatsappId && link?.discordId);
  const whatsappIds = new Set(usable.map(link => canonicalWhatsAppId(link.whatsappId)));
  const discordIds = new Set(usable.map(link => String(link.discordId)));
  if (whatsappIds.size !== 1 || discordIds.size !== 1) return [];
  if (String(sender).startsWith("discord:")
    && !discordIds.has(String(sender).slice("discord:".length))) return [];
  return usable;
}

// Only explicit database aliases and verified account links connect identities.
// A Discord snowflake is never stripped into a WhatsApp phone/LID.
export async function resolveAccountIdentity(db, sender, discordId = null) {
  const ids = new Set(identityVariants(sender));
  const discordIds = new Set();
  if (discordId) discordIds.add(String(discordId));
  if (String(sender).startsWith("discord:")) discordIds.add(String(sender).slice(8));
  let preferred = String(sender).replace(/:\d+@/, "@").replace(/@c\.us$/i, "@s.whatsapp.net");
  const profiles = new Map();
  for (let pass = 0; pass < 5; pass++) {
    const previousSize = ids.size;
    const verifiedPairs = await db.collection("identity_links").find({
      source: "baileys",
      $or: [{ _id: { $in: [...ids] } }, { phoneId: { $in: [...ids] } }],
    }).toArray();
    for (const pair of verifiedPairs) {
      if (!/^\d+@lid$/.test(String(pair._id)) || !/^\d+@s\.whatsapp\.net$/.test(String(pair.phoneId))) continue;
      for (const value of [pair._id, pair.phoneId]) for (const alias of identityVariants(value)) ids.add(alias);
    }
    for (const id of discordIds) ids.add(`discord:${id}`);
    const matchedLinks = await db.collection("account_links").find({
      status: "active",
      $or: [{ whatsappId: { $in: [...ids] } }, { discordId: { $in: [...discordIds] } }],
    }).toArray();
    // A stale/conflicting link must not make two people's collections appear
    // to belong to the same identity. Ignore ambiguous active mappings rather
    // than guessing which account owns them.
    const relatedLinks = matchedLinks.length
      ? await db.collection("account_links").find({
          status: "active",
          $or: [
            { whatsappId: { $in: [...new Set(matchedLinks.flatMap(link => identityVariants(link.whatsappId)))] } },
            { discordId: { $in: [...new Set(matchedLinks.map(link => String(link.discordId || "")).filter(Boolean))] } },
          ],
        }).toArray()
      : [];
    const links = unambiguousActiveLinks([...matchedLinks, ...relatedLinks], sender);
    for (const link of links) {
      for (const id of identityVariants(link.whatsappId)) ids.add(id);
      if (link.discordId) discordIds.add(String(link.discordId));
      if (String(sender).startsWith("discord:") && String(link.discordId) === String(sender).slice(8)) {
        preferred = String(link.whatsappId).replace(/:\d+@/, "@").replace(/@c\.us$/i, "@s.whatsapp.net");
      }
    }
    for (const id of discordIds) ids.add(`discord:${id}`);
    const records = await db.collection("users").find({
      $or: [
        ...[...ID_FIELDS, "identityAliases"].map(field => ({ [field]: { $in: [...ids] } })),
        { discordId: { $in: [...discordIds] } },
      ],
    }).toArray();
    for (const record of records) {
      profiles.set(String(record._id), record);
      for (const value of [...ID_FIELDS.map(field => record[field]), ...(record.identityAliases || [])]) {
        for (const id of identityVariants(value)) ids.add(id);
      }
    }
    if (ids.size === previousSize && pass > 0) break;
  }
  for (const id of discordIds) ids.add(`discord:${id}`);
  const records = [...profiles.values()];
  const account = selectAccount(records);
  return { account, accountId: account?._id || preferred, ids: [...ids], discordIds: [...discordIds] };
}

// Same choice on every platform and for every alias. Never sum two wallets or
// choose an empty canonical placeholder just because it was the input ID.
export function selectAccount(records) {
  const age = record => {
    const value = new Date(record.registeredAt || record.createdAt || 0).getTime();
    return value > 0 ? value : Number.MAX_SAFE_INTEGER;
  };
  return [...records].sort((a, b) =>
    Number(b.registered === true) - Number(a.registered === true)
    || Number(!!b.websiteId) - Number(!!a.websiteId)
    || Number(String(a._id).startsWith("discord:")) - Number(String(b._id).startsWith("discord:"))
    || age(a) - age(b)
    || String(a._id).localeCompare(String(b._id)))[0] || null;
}

export function collectionOwnershipQuery(values, fields) {
  const full = values.filter(value => !/^\+?\d+$/.test(String(value)));
  const bare = values.filter(value => /^\d+$/.test(String(value)));
  const numeric = [...new Set([...bare, ...bare.map(Number).filter(Number.isSafeInteger)])];
  const lids = full.filter(value => /^\d+@lid$/.test(String(value)));
  const clauses = fields.flatMap(field => [
    { [field]: { $in: full } },
    // Old card creation stripped @lid but retained the full original address.
    // A numeric key with that evidence must not be claimed by a phone account.
    { [field]: { $in: numeric }, whatsappNumber: { $not: /@lid$/i } },
    ...lids.map(lid => {
      const local = String(lid).split("@")[0];
      return { [field]: { $in: [local, ...(Number.isSafeInteger(Number(local)) ? [Number(local)] : [])] },
        whatsappNumber: lid };
    }),
  ]);
  return { $or: clauses };
}
