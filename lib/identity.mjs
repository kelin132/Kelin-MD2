/**
 * KELIN MD — Identity Normalization
 * Handles JID/LID mapping to ensure users don't lose data when WhatsApp
 * switches their identity in groups.
 */
import { getDb } from "./mongo.mjs";
import { personalJid, findGroupParticipant, participantIds, getGroupMetadata } from "./groupIdentity.mjs";
import { resolveAccountIdentity } from "./accountIdentity.mjs";
import { invalidateAccountIdentityValues } from "./collectionIdentity.mjs";
const migratedLidPairs = new Set();
const verifiedLidToPhone = new Map();
const verifiedPhoneToLid = new Map();
const reverseIdentityLookups = new Map();
const pendingIdentityMigrations = new Map();
const IDENTITY_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_IDENTITY_CACHE_ENTRIES = 2048;

function cacheIdentityPair(lid, phone) {
  const normalizedLid = personalJid(lid);
  const normalizedPhone = personalJid(phone);
  if (!normalizedLid.endsWith("@lid") || !normalizedPhone.endsWith("@s.whatsapp.net")) return;
  const expiresAt = Date.now() + IDENTITY_CACHE_TTL_MS;
  verifiedLidToPhone.set(normalizedLid, { value: normalizedPhone, expiresAt });
  verifiedPhoneToLid.set(normalizedPhone, { value: normalizedLid, expiresAt });
  for (const cache of [verifiedLidToPhone, verifiedPhoneToLid]) {
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= Date.now()) cache.delete(key);
    }
    while (cache.size > MAX_IDENTITY_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
  }
}

function cachedIdentity(cache, key) {
  const entry = cache.get(key);
  if (!entry) return "";
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return "";
  }
  return entry.value;
}

function scheduleIdentityMigration(lid, phone, sock, chatId) {
  const normalizedLid = personalJid(lid);
  const normalizedPhone = personalJid(phone);
  if (!normalizedLid.endsWith("@lid") || !normalizedPhone.endsWith("@s.whatsapp.net")) {
    return Promise.resolve();
  }
  cacheIdentityPair(normalizedLid, normalizedPhone);
  const key = `${normalizedLid}\0${normalizedPhone}`;
  if (migratedLidPairs.has(key)) return Promise.resolve();
  if (pendingIdentityMigrations.has(key)) return pendingIdentityMigrations.get(key);

  const task = Promise.resolve()
    .then(() => resolveAndMigrateIdentity(normalizedLid, sock, chatId, normalizedPhone))
    .catch(() => {})
    .finally(() => pendingIdentityMigrations.delete(key));
  pendingIdentityMigrations.set(key, task);
  return task;
}

function scheduleReverseIdentityLearning(phone, sock, chatId) {
  const normalizedPhone = personalJid(phone);
  if (!normalizedPhone.endsWith("@s.whatsapp.net") || !sock) return;
  const key = `${chatId || ""}\0${normalizedPhone}`;
  const existing = reverseIdentityLookups.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.promise;

  const entry = { expiresAt: Number.POSITIVE_INFINITY, promise: null };
  entry.promise = Promise.resolve()
    .then(async () => {
      let lid = await resolveJidToLid(normalizedPhone, sock);
      if (!lid && chatId?.endsWith("@g.us")) {
        try {
          const member = findGroupParticipant(await getGroupMetadata(sock, chatId), [normalizedPhone]);
          lid = participantIds(member).find((id) => id.endsWith("@lid")) || "";
          if (lid) cacheIdentityPair(lid, normalizedPhone);
        } catch {
          // Keep the phone identity; group metadata is only a legacy fallback.
        }
      }
      if (lid) await scheduleIdentityMigration(lid, normalizedPhone, sock, chatId);
      entry.expiresAt = Date.now() + (lid ? IDENTITY_CACHE_TTL_MS : 15_000);
    })
    .catch(() => {
      entry.expiresAt = Date.now() + 15_000;
    });
  reverseIdentityLookups.set(key, entry);
  while (reverseIdentityLookups.size > MAX_IDENTITY_CACHE_ENTRIES) {
    const oldestKey = reverseIdentityLookups.keys().next().value;
    if (reverseIdentityLookups.get(oldestKey)?.expiresAt === Number.POSITIVE_INFINITY) break;
    reverseIdentityLookups.delete(oldestKey);
  }
  return entry.promise;
}

export async function waitForIdentityLearning() {
  await Promise.allSettled([
    ...[...reverseIdentityLookups.values()].map((entry) => entry.promise),
    ...pendingIdentityMigrations.values(),
  ]);
}


/**
 * Strip device suffixes and normalize JID formats.
 * "27628114340:5@s.whatsapp.net" → "27628114340@s.whatsapp.net"
 * "12345:0@lid" → "12345@lid"
 */
export function normalizeJid(jid = "") {
  if (typeof jid !== "string") return jid;
  if (jid.trim().startsWith("discord:")) return jid.trim();
  const [local = "", server = "s.whatsapp.net"] = jid.trim().split("@");
  const normalizedServer = server.toLowerCase() === "c.us" ? "s.whatsapp.net" : server;
  const localPart = local.split(":")[0];
  const normalizedLocal = /^\+?[\d\s().-]+$/.test(localPart)
    ? localPart.replace(/\D/g, "")
    : localPart;
  return normalizedLocal + "@" + normalizedServer;
}

export function bareJidNumber(value = "") {
  return String(value || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

/**
 * Return the canonical phone fields used by the website lookup.
 * Privacy LIDs do not produce phone aliases until Baileys supplies a verified
 * LID-to-phone mapping.
 */
export function phoneIdentityFields(value) {
  const normalized = normalizeJid(String(value || ""));
  if (!normalized.endsWith("@s.whatsapp.net")) return {};

  const digits = bareJidNumber(normalized);
  if (!digits) return {};

  return {
    phoneNumber: digits,
    whatsappNumber: normalized,
    jid: normalized,
    userId: normalized,
  };
}

export async function findUserByIdentity(id, options = {}) {
  const db = getDb();
  const { accountId } = await resolveAccountIdentity(db, normalizeJid(id), null, { includeAccount: false });
  return db.collection("users").findOne({ _id: accountId }, options);
}

/**
 * Return the common legacy spellings of one WhatsApp identity.
 * Privacy LIDs stay isolated from phone-number aliases because their numeric
 * local part is not a phone number.
 */
export function whatsappIdentityVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (raw.startsWith("discord:")) return [raw];

  const separator = raw.indexOf("@");
  const rawLocal = separator >= 0 ? raw.slice(0, separator) : raw;
  const rawServer = separator >= 0 ? raw.slice(separator) : "";
  const compact = rawLocal.replace(/[\s().-]/g, "") + rawServer;
  const normalized = normalizeJid(compact);
  const [local = "", server = "s.whatsapp.net"] = normalized.split("@");
  const digits = local.replace(/\D/g, "");
  const isLid = server.toLowerCase() === "lid";

  return [...new Set([
    raw,
    normalized,
    normalized.replace(/:\d+(?=@)/, ""),
    ...(isLid
      ? (digits ? [`${digits}@lid`] : [])
      : [digits, digits ? `+${digits}` : ""].filter(Boolean)),
    digits && !isLid ? `${digits}@${server}` : "",
    digits && !isLid ? `${digits}@s.whatsapp.net` : "",
    digits && !isLid ? `${digits}@c.us` : "",
    digits && !isLid ? `${digits}:0@s.whatsapp.net` : "",
    digits && !isLid ? `${digits}:0@c.us` : "",
  ].filter(Boolean))];
}

/**
 * Resolve an LID to a JID (phone number).
 * Prefer Baileys' native mapping, with group metadata as a legacy fallback.
 */
export async function resolveLidToJid(sender, sock, chatId, alternateSender = "") {
  const lid = personalJid(sender);
  if (!lid.endsWith("@lid")) return normalizeJid(sender);
  const alternate = personalJid(alternateSender);
  if (alternate.endsWith("@s.whatsapp.net")) return alternate;
  const cachedPhone = cachedIdentity(verifiedLidToPhone, lid);
  if (cachedPhone) return cachedPhone;
  if (!sock) return lid;

  try {
    const lidNum = bareJidNumber(sender);
    const mapping = sock.signalRepository?.lidMapping;

    if (typeof mapping?.getPNForLID === "function") {
      const phoneJid = await mapping.getPNForLID(`${lidNum}@lid`);
      if (personalJid(phoneJid).endsWith("@s.whatsapp.net")) {
        const phone = personalJid(phoneJid);
        cacheIdentityPair(lid, phone);
        return phone;
      }
    }

    if (typeof mapping?.getPNsForLIDs === "function") {
      const mapped = await mapping.getPNsForLIDs([`${lidNum}@lid`]);
      const phoneJid = mapped instanceof Map
        ? mapped.get(`${lidNum}@lid`) || mapped.get(lidNum)
        : Array.isArray(mapped)
          ? mapped[0]?.pn || mapped[0]?.phoneNumber || mapped[0]
          : mapped?.[`${lidNum}@lid`] || mapped?.[lidNum];
      if (personalJid(phoneJid).endsWith("@s.whatsapp.net")) {
        const phone = personalJid(phoneJid);
        cacheIdentityPair(lid, phone);
        return phone;
      }
    }
  } catch { /* Native cache failures must still try current group metadata. */ }

  try {
    if (chatId?.endsWith("@g.us") && typeof sock.groupMetadata === "function") {
      const meta = await getGroupMetadata(sock, chatId);
      const participant = findGroupParticipant(meta, [lid]);
      const phone = participantIds(participant).find(id => id.endsWith("@s.whatsapp.net"));
      if (phone) {
        cacheIdentityPair(lid, phone);
        return phone;
      }
    }

    // Check if it's the bot itself
    const botLid = sock.user?.lid || "";
    if (personalJid(botLid) === lid && personalJid(sock.user?.id).endsWith("@s.whatsapp.net")) {
      const phone = personalJid(sock.user.id);
      cacheIdentityPair(lid, phone);
      return phone;
    }
  } catch {
    // A missing native mapping or group metadata must not block a command.
  }

  return normalizeJid(sender);
}

/**
 * Get a consistent ID for database storage.
 * Prioritizes the phone-number JID format.
 */
export async function getDatabaseId(sender, sock, chatId) {
  const normalized = normalizeJid(sender);
  if (normalized.endsWith("@s.whatsapp.net")) return normalized;
  
  // It's an LID, try to resolve it
  const resolved = await resolveLidToJid(sender, sock, chatId);
  return resolved;
}

/**
 * Annotate verified aliases in place; never move/delete an account or change
 * resource ownership. Original full-LID evidence is needed by legacy lookups.
 */
export async function migrateLidData(lid, jid) {
  if (!lid.endsWith("@lid") || !jid.endsWith("@s.whatsapp.net")) return;
  const migrationKey = `${lid}\0${jid}`;
  if (migratedLidPairs.has(migrationKey)) return;
  
  const db = await getDb();
  let migrationComplete = true;
  // Only the full LID is an unambiguous ownership key. Its bare numeric local
  // part can be another person's real phone number and must never be migrated.
  const legacyIds = [lid];
  const bestEffort = async (operation) => {
    try {
      await operation();
      return true;
    } catch {
      migrationComplete = false;
      // One legacy collection's index/schema must not block identity repair in
      // the other collections.
      return false;
    }
  };
  // A user's _id is also a website session subject. Never copy its unique
  // websiteId into another document, or delete the original account.
  await bestEffort(() => db.collection("users").updateOne(
    { _id: lid },
    { $set: phoneIdentityFields(jid), $addToSet: { identityAliases: { $each: [lid, jid] } } },
  ));
  await bestEffort(() => db.collection("users").updateOne(
    { _id: jid },
    { $addToSet: { identityAliases: { $each: [lid, jid] } } },
  ));
  // Cards use userId (usually a bare number), not _id, as their ownership key.
  await bestEffort(() => db.collection("mn_users").updateMany(
    { userId: { $in: legacyIds } },
    { $addToSet: { identityAliases: { $each: [lid, jid] } } },
  ));
  // Preserve legacy Pokémon documents in place while adding the verified
  // WhatsApp alias. Use the full LID only: its bare digits could be a different
  // player's phone-number ownership key.
  await bestEffort(() => db.collection("pokemon_trainers").updateMany(
    { $or: ["_id", "jid", "userId", "ownerJid", "whatsappNumber"]
      .map((field) => ({ [field]: { $in: legacyIds } })) },
    {
      $addToSet: { identityAliases: { $each: [lid, jid] } },
    },
  ));
  await bestEffort(() => db.collection("pokemon_owned").updateMany(
    { $or: ["ownerJid", "owner", "userId", "whatsappNumber"]
      .map((field) => ({ [field]: { $in: legacyIds } })) },
    {
      $addToSet: { identityAliases: { $each: [lid, jid] } },
    },
  ));
  // Never relocate/delete ownership documents during message routing.
  if (migrationComplete) migratedLidPairs.add(migrationKey);
}

export async function resolveJidToLid(sender, sock) {
  const jid = normalizeJid(sender);
  if (!jid.endsWith("@s.whatsapp.net") || !sock) return "";
  const cachedLid = cachedIdentity(verifiedPhoneToLid, jid);
  if (cachedLid) return cachedLid;

  try {
    const mapping = sock.signalRepository?.lidMapping;
    if (typeof mapping?.getLIDForPN === "function") {
      const lid = await mapping.getLIDForPN(jid);
      if (lid && String(lid).endsWith("@lid")) {
        const normalizedLid = normalizeJid(String(lid));
        cacheIdentityPair(normalizedLid, jid);
        return normalizedLid;
      }
    }

    if (typeof mapping?.getLIDsForPNs === "function") {
      const mapped = await mapping.getLIDsForPNs([jid]);
      const lid = mapped instanceof Map
        ? mapped.get(jid) || mapped.get(bareJidNumber(jid))
        : Array.isArray(mapped)
          ? mapped[0]?.lid || mapped[0]?.lidJid || mapped[0]
          : mapped?.[jid] || mapped?.[bareJidNumber(jid)];
      if (lid && String(lid).endsWith("@lid")) {
        const normalizedLid = normalizeJid(String(lid));
        cacheIdentityPair(normalizedLid, jid);
        return normalizedLid;
      }
    }
  } catch {
    // Reverse mapping is optional and must not block phone-JID handling.
  }

  return "";
}

export async function rememberIdentityAlias(lid, jid) {
  if (!lid?.endsWith("@lid") || !jid?.endsWith("@s.whatsapp.net")) return;

  try {
    const db = await getDb();
    // Persist even when an economy profile does not exist yet (cards/trainer
    // can predate registration). Never overwrite a conflicting verified pair.
    await db.collection("identity_links").updateOne(
      { _id: normalizeJid(lid) },
      { $setOnInsert: { phoneId: normalizeJid(jid), source: "baileys", createdAt: new Date() } },
      { upsert: true },
    );
    const verified = await db.collection("identity_links").findOne({ _id: normalizeJid(lid) });
    if (verified?.phoneId !== normalizeJid(jid)) throw new Error("Conflicting WhatsApp identity mapping");
    invalidateAccountIdentityValues(lid);
    invalidateAccountIdentityValues(normalizeJid(lid));
    invalidateAccountIdentityValues(jid);
    invalidateAccountIdentityValues(normalizeJid(jid));
    await db.collection("users").updateOne(
      { _id: normalizeJid(lid), registered: true },
      {
        $set: {
          ...phoneIdentityFields(jid),
        },
      },
    );
  } catch {
    return false;
  }
  return true;
}

export async function resolveAndMigrateIdentity(sender, sock, chatId, alternateSender = "") {
  const resolvedJid = await resolveLidToJid(sender, sock, chatId, alternateSender);
  const sourceLid = sender?.endsWith("@lid")
    ? normalizeJid(sender)
    : await resolveJidToLid(resolvedJid, sock);

  if (sourceLid && resolvedJid.endsWith("@s.whatsapp.net")) {
    const migrationKey = `${sourceLid}\0${resolvedJid}`;
    cacheIdentityPair(sourceLid, resolvedJid);
    try {
      if (!migratedLidPairs.has(migrationKey) &&
          await rememberIdentityAlias(sourceLid, resolvedJid)) {
        await migrateLidData(sourceLid, resolvedJid);
      }
    } catch {
      // Identity repair is best-effort during command routing.
    }
  }

  return resolvedJid;
}

export async function resolveMessageSender(sender, alternateSender, sock, chatId) {
  const rawSender = String(sender || "");
  const alternate = String(alternateSender || "");
  const lid = rawSender.endsWith("@lid")
    ? rawSender
    : alternate.endsWith("@lid")
      ? alternate
      : "";
  if (!lid) {
    const phone = personalJid(rawSender);
    if (phone.endsWith("@s.whatsapp.net")) {
      void scheduleReverseIdentityLearning(phone, sock, chatId);
      return phone;
    }
    return normalizeJid(rawSender);
  }

  const phone = rawSender.endsWith("@lid") ? alternate : rawSender;
  const phoneJid = personalJid(phone);
  if (phoneJid.endsWith("@s.whatsapp.net")) {
    void scheduleIdentityMigration(lid, phoneJid, sock, chatId);
    return phoneJid;
  }
  return resolveAndMigrateIdentity(lid, sock, chatId, phone);
}

export async function migrateKnownLidUsers(sock) {
  if (!sock) return;

  const db = await getDb();
  const docs = await db.collection("users")
    .find({ _id: { $regex: /@lid$/i }, registered: true }, { projection: { _id: 1 } })
    .limit(1000)
    .toArray();

  for (const doc of docs) {
    const lid = normalizeJid(String(doc?._id || ""));
    const jid = await resolveLidToJid(lid, sock);
    if (jid.endsWith("@s.whatsapp.net")) {
      if (await rememberIdentityAlias(lid, jid)) await migrateLidData(lid, jid);
    }
  }
}
