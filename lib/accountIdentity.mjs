const ID_FIELDS = ["_id", "userId", "jid", "whatsappNumber", "phoneNumber", "phone", "whatsappId", "whatsappJid", "userJid", "migratedFrom"];

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
  if (server || (local.length >= 7 && local.length <= 15)) return [raw, local, `${local}@s.whatsapp.net`, `${local}@c.us`];
  return [raw, `${local}@lid`];
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
  for (let pass = 0; pass < 2; pass++) {
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
  }
  for (const id of discordIds) ids.add(`discord:${id}`);
  const records = [...profiles.values()];
  const account = records.find(record => record.registered && String(record._id) === preferred)
    || records.find(record => record.registered && !String(record._id).startsWith("discord:"))
    || records.find(record => record.registered)
    || records.find(record => String(record._id) === preferred)
    || records.find(record => String(record._id) === String(sender))
    || null;
  return { account, accountId: account?._id || preferred, ids: [...ids], discordIds: [...discordIds] };
}
