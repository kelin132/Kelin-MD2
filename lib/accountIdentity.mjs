const ID_FIELDS = ["_id", "userId", "jid", "whatsappNumber", "phoneNumber", "phone", "whatsappId", "whatsappJid", "userJid", "sender", "owner", "migratedFrom"];

export function identityVariants(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  if (raw.startsWith("discord:")) return [raw];
  const match = raw.match(/^\+?(\d+)(?::\d+)?(?:@(s\.whatsapp\.net|c\.us|lid))?$/i);
  if (!match) return [raw];
  const [, local, server] = match;
  if (server?.toLowerCase() === "lid") return [raw, local, `${local}@lid`];
  if (server || (local.length >= 7 && local.length <= 15)) return [raw, local, `${local}@s.whatsapp.net`, `${local}@c.us`];
  return [raw, `${local}@lid`];
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
    const links = await db.collection("account_links").find({
      status: "active",
      $or: [{ whatsappId: { $in: [...ids] } }, { discordId: { $in: [...discordIds] } }],
    }).toArray();
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
      if (record.discordId) discordIds.add(String(record.discordId));
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
