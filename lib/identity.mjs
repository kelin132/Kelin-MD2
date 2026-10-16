/**
 * KELIN MD — Identity Normalization
 * Handles JID/LID mapping to ensure users don't lose data when WhatsApp
 * switches their identity in groups.
 */
import { getDb } from "./mongo.mjs";
import { isDeepStrictEqual } from "node:util";

const identityMigrationCache = new WeakMap();
const identityMigrationInFlight = new WeakMap();
const identityResolutionCache = new WeakMap();
const IDENTITY_MIGRATION_CACHE_MS = 60 * 60 * 1000;
const IDENTITY_RESOLUTION_CACHE_MS = 5 * 60 * 1000;
const IDENTITY_RESOLUTION_NEGATIVE_CACHE_MS = 60 * 1000;
// Bump this when identity repair needs to revisit accounts migrated by an
// earlier version, including records that appeared under the LID afterward.
const IDENTITY_MIGRATION_VERSION = 4;
const IDENTITY_ALIAS_COLLECTION = "whatsapp_identity_aliases";
const USER_PROFILE_FIELDS = ["name", "age", "birthday", "bio"];
const USER_IDENTITY_FIELDS = [
  "userId", "whatsappNumber", "phoneNumber", "phone", "whatsappId",
  "whatsappJid", "jid", "userJid", "sender", "owner",
];
const MAX_IDENTITY_RESOLUTION_CACHE_ENTRIES = 4096;
const USER_DOCUMENT_COLLECTIONS = [
  { name: "pokemon_trainers", key: "jid", merge: "pokemonTrainer" },
  { name: "dbz_players", key: "jid", merge: "dbzPlayer" },
  { name: "dbz_fighters", key: "ownerJid" },
  { name: "ptcg_players", key: "jid", merge: "ptcgPlayer" },
  { name: "akira_memory", key: "_id", merge: "akiraMemory" },
  { name: "workSessions", key: "_id" },
  { name: "petpvp_cd", key: "_id", merge: "cooldown" },
  { name: "rpg_users", key: "_id" },
];
const USER_REFERENCE_COLLECTIONS = [
  { name: "account_links", fields: { whatsappId: "jid" } },
  { name: "companies", fields: { ownerId: "jid" } },
  { name: "pokemon_owned", fields: { ownerJid: "jid" } },
  { name: "pets", fields: { owner: "jid" } },
  { name: "ptcg_market", fields: { sellerJid: "jid" } },
  { name: "ptcg_trades", fields: { fromJid: "jid", toJid: "jid" } },
  { name: "mn_card_market", fields: { sellerId: "digits" } },
  { name: "giveaways", fields: { creatorJid: "jid", winnerJid: "jid" }, arrays: { participants: "jid" } },
];

function getIdentityMigrationCache(sock) {
  if (!sock || (typeof sock !== "object" && typeof sock !== "function")) return null;
  let cache = identityMigrationCache.get(sock);
  if (!cache) {
    cache = new Map();
    identityMigrationCache.set(sock, cache);
  }
  return cache;
}

function getIdentityMigrationInFlight(sock) {
  if (!sock || (typeof sock !== "object" && typeof sock !== "function")) return null;
  let inFlight = identityMigrationInFlight.get(sock);
  if (!inFlight) {
    inFlight = new Map();
    identityMigrationInFlight.set(sock, inFlight);
  }
  return inFlight;
}

function getIdentityResolutionCache(sock) {
  if (!sock || (typeof sock !== "object" && typeof sock !== "function")) return null;
  let cache = identityResolutionCache.get(sock);
  if (!cache) {
    cache = new Map();
    identityResolutionCache.set(sock, cache);
  }
  return cache;
}

function readIdentityResolution(sock, key) {
  const cache = getIdentityResolutionCache(sock);
  const entry = cache?.get(key);
  if (!entry) return { hit: false, value: "" };
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false, value: "" };
  }
  return { hit: true, value: entry.value };
}

function cacheIdentityResolution(sock, key, value) {
  const cache = getIdentityResolutionCache(sock);
  if (!cache) return;

  if (cache.size >= MAX_IDENTITY_RESOLUTION_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(cachedKey);
    }
    if (cache.size >= MAX_IDENTITY_RESOLUTION_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + (value ? IDENTITY_RESOLUTION_CACHE_MS : IDENTITY_RESOLUTION_NEGATIVE_CACHE_MS),
  });
}

function rememberIdentityMapping(sock, lid, jid) {
  const normalizedLid = normalizeJid(String(lid || ""));
  const normalizedJid = asPhoneJid(jid);
  if (!normalizedLid.endsWith("@lid") || !normalizedJid) return;

  const cache = getIdentityResolutionCache(sock);
  if (cache) {
    const scopedLidPrefix = `lid:${normalizedLid}:`;
    for (const key of cache.keys()) {
      if (key.startsWith(scopedLidPrefix)) cache.delete(key);
    }
  }
  cacheIdentityResolution(sock, `lid:${normalizedLid}`, normalizedJid);
  cacheIdentityResolution(sock, `phone:${normalizedJid}`, normalizedLid);
}

/**
 * Strip device suffixes and normalize JID formats.
 * "27628114340:5@s.whatsapp.net" → "27628114340@s.whatsapp.net"
 * "12345:0@lid" → "12345@lid"
 */
export function normalizeJid(jid = "") {
  if (typeof jid !== "string") return jid;
  const [local = "", server = "s.whatsapp.net"] = jid.trim().split("@");
  const normalizedServer = server.toLowerCase() === "c.us" ? "s.whatsapp.net" : server;
  return local.split(":")[0] + "@" + normalizedServer;
}

export function bareJidNumber(value = "") {
  return String(value || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function asPhoneJid(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const normalized = normalizeJid(raw);
  return normalized.endsWith("@s.whatsapp.net") ? normalized : "";
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

/**
 * Return the common legacy spellings of one WhatsApp identity.
 * Privacy LIDs stay isolated from phone-number aliases because their numeric
 * local part is not a phone number.
 */
export function whatsappIdentityVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeJid(raw);
  const [local = "", server = "s.whatsapp.net"] = normalized.split("@");
  const digits = local.replace(/\D/g, "");
  const isLid = server.toLowerCase() === "lid";

  return [...new Set([
    raw,
    normalized,
    normalized.replace(/:\d+(?=@)/, ""),
    ...(isLid
      ? [digits ? `${digits}@lid` : ""]
      : [
          digits,
          digits ? `+${digits}` : "",
          digits ? `${digits}@${server}` : "",
          digits ? `${digits}@s.whatsapp.net` : "",
          digits ? `${digits}@c.us` : "",
          digits ? `${digits}:0@s.whatsapp.net` : "",
          digits ? `${digits}:0@c.us` : "",
        ]),
  ].filter(Boolean))];
}

/**
 * Check participant identifiers against normalized WhatsApp identities without
 * treating privacy-LID digits as phone-number digits.
 */
export function participantMatchesIdentity(participant, identityJids = []) {
  const identities = new Set(
    [...identityJids]
      .filter((value) => typeof value === "string" && value.trim())
      .map(normalizeJid),
  );
  return [participant?.id, participant?.lid, participant?.phoneNumber].some(
    (value) =>
      typeof value === "string" &&
      value.trim() &&
      identities.has(normalizeJid(value)),
  );
}

/**
 * Resolve an LID to a JID (phone number).
 * Prefer Baileys' native mapping, with group metadata as a legacy fallback.
 */
export async function resolveLidToJid(sender, sock, chatId, alternateSender = "", database = null) {
  const normalizedSender = normalizeJid(sender);
  if (!normalizedSender.endsWith("@lid")) return normalizedSender;
  if (!sock) return normalizedSender;

  try {
    const alternatePhoneJid = asPhoneJid(alternateSender);
    if (alternatePhoneJid) {
      rememberIdentityMapping(sock, normalizedSender, alternatePhoneJid);
      return alternatePhoneJid;
    }

    const cacheKey = chatId?.endsWith("@g.us")
      ? `lid:${normalizedSender}:${chatId}`
      : `lid:${normalizedSender}`;
    const cached = readIdentityResolution(sock, cacheKey);
    if (cached.hit) return cached.value || normalizedSender;

    const lidNum = bareJidNumber(normalizedSender);
    const mapping = sock.signalRepository?.lidMapping;

    if (typeof mapping?.getPNForLID === "function") {
      const phoneJid = await mapping.getPNForLID(`${lidNum}@lid`);
      const canonicalPhoneJid = asPhoneJid(phoneJid);
      if (canonicalPhoneJid) {
        rememberIdentityMapping(sock, normalizedSender, canonicalPhoneJid);
        return canonicalPhoneJid;
      }
    }

    if (typeof mapping?.getPNsForLIDs === "function") {
      const mapped = await mapping.getPNsForLIDs([`${lidNum}@lid`]);
      const phoneJid = mapped instanceof Map
        ? mapped.get(`${lidNum}@lid`) || mapped.get(lidNum)
        : Array.isArray(mapped)
          ? mapped[0]?.pn || mapped[0]?.phoneNumber || mapped[0]
          : mapped?.[`${lidNum}@lid`] || mapped?.[lidNum];
      const canonicalPhoneJid = asPhoneJid(phoneJid);
      if (canonicalPhoneJid) {
        rememberIdentityMapping(sock, normalizedSender, canonicalPhoneJid);
        return canonicalPhoneJid;
      }
    }

    if (chatId?.endsWith("@g.us") && typeof sock.groupMetadata === "function") {
      const meta = await sock.groupMetadata(chatId);
      for (const participant of meta.participants || []) {
        const matchingLid = [participant?.lid, participant?.id].some((value) => {
          if (typeof value !== "string" || !value.trim()) return false;
          const normalized = normalizeJid(value);
          return normalized.endsWith("@lid") && bareJidNumber(normalized) === lidNum;
        });
        if (!matchingLid) continue;

        // Baileys may expose the privacy address as id and put the verified
        // phone JID in phoneNumber; older versions use a phone JID in id.
        const canonicalPhoneJid = [participant?.phoneNumber, participant?.id]
          .map(asPhoneJid)
          .find(Boolean);
        if (canonicalPhoneJid) {
          rememberIdentityMapping(sock, normalizedSender, canonicalPhoneJid);
          return canonicalPhoneJid;
        }
      }
    }

    // Check if it's the bot itself
    const botLid = sock.user?.lid || "";
    if (botLid && bareJidNumber(botLid) === lidNum && sock.user?.id) {
      const canonicalPhoneJid = asPhoneJid(sock.user.id);
      if (canonicalPhoneJid) {
        rememberIdentityMapping(sock, normalizedSender, canonicalPhoneJid);
        return canonicalPhoneJid;
      }
    }
  } catch {
    // A missing native mapping or group metadata must not block a command.
  }

  // Baileys may not have the LID mapping loaded after a reconnect. A previously
  // verified durable alias is still safe to use and keeps this user on the
  // canonical phone account instead of creating a second LID-keyed profile.
  try {
    const db = database || await getDb();
    const alias = await db.collection(IDENTITY_ALIAS_COLLECTION).findOne(
      { _id: normalizedSender },
      { projection: { jid: 1 } },
    );
    const canonicalPhoneJid = asPhoneJid(alias?.jid);
    if (canonicalPhoneJid) {
      rememberIdentityMapping(sock, normalizedSender, canonicalPhoneJid);
      return canonicalPhoneJid;
    }
  } catch {
    // A missing database or alias must not block LID-based command handling.
  }

  const cacheKey = chatId?.endsWith("@g.us")
    ? `lid:${normalizedSender}:${chatId}`
    : `lid:${normalizedSender}`;
  cacheIdentityResolution(sock, cacheKey, "");
  return normalizedSender;
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

/** Move LID-owned account and game records to their verified phone JID. */
async function runIdentityMigrations(tasks, concurrency = 6) {
  let nextTask = 0;
  let succeeded = true;
  const worker = async () => {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask++];
      try {
        if (!(await task())) succeeded = false;
      } catch {
        succeeded = false;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );
  return succeeded;
}

async function migrateUserIdentityDocuments(lid, jid, db) {
  const collection = db.collection("users");
  const normalizedLid = normalizeJid(lid);
  const normalizedJid = normalizeJid(jid);
  const variants = legacyIdentityVariants(normalizedLid);
  const identityFields = ["_id", ...USER_IDENTITY_FIELDS];
  const candidates = await collection.find({
    $or: identityFields.map((field) => ({ [field]: { $in: variants } })),
  }).toArray();
  const isSourceLid = (value) =>
    typeof value === "string" &&
    /@lid$/i.test(value.trim()) &&
    normalizeJid(value) === normalizedLid;
  const sources = candidates.filter((doc) =>
    identityFields.some((field) => isSourceLid(doc?.[field])),
  );
  let succeeded = true;

  for (const source of sources) {
    if (source?._id === undefined || source?._id === null) {
      succeeded = false;
      continue;
    }
    if (String(source._id) === normalizedJid) {
      const updated = await collection.updateOne(
        { _id: source._id },
        { $set: { ...phoneIdentityFields(normalizedJid), migratedFrom: normalizedLid, migratedAt: new Date() } },
      );
      if (updated.matchedCount === 0) succeeded = false;
      continue;
    }

    let destination = await collection.findOne({ _id: normalizedJid });
    let merged = mergeRegisteredIdentityDocuments(
      source,
      destination || { _id: normalizedJid },
      normalizedLid,
      normalizedJid,
    );
    Object.assign(merged, phoneIdentityFields(normalizedJid));
    if (source.registered === true || destination?.registered === true) {
      merged.registered = true;
    } else if (destination && Object.hasOwn(destination, "registered") && !Object.hasOwn(source, "registered")) {
      merged.registered = destination.registered;
    }

    if (!destination) {
      try {
        await collection.insertOne(merged);
      } catch {
        destination = await collection.findOne({ _id: normalizedJid });
        if (!destination) {
          succeeded = false;
          continue;
        }
        merged = mergeRegisteredIdentityDocuments(source, destination, normalizedLid, normalizedJid);
        Object.assign(merged, phoneIdentityFields(normalizedJid));
        if (source.registered === true || destination.registered === true) merged.registered = true;
        const replaced = await collection.replaceOne({ _id: normalizedJid }, merged);
        if (replaced.matchedCount === 0) {
          succeeded = false;
          continue;
        }
      }
    } else {
      const replaced = await collection.replaceOne({ _id: normalizedJid }, merged);
      if (replaced.matchedCount === 0) {
        succeeded = false;
        continue;
      }
    }

    const deleted = await collection.deleteOne({ _id: source._id });
    if (deleted.deletedCount === 0) succeeded = false;
  }
  return succeeded;
}

export async function migrateLidData(lid, jid, database = null) {
  const normalizedLid = normalizeJid(lid);
  const normalizedJid = normalizeJid(jid);
  if (!normalizedLid.endsWith("@lid") || !normalizedJid.endsWith("@s.whatsapp.net")) return false;

  const db = database || await getDb();
  const aliases = db.collection(IDENTITY_ALIAS_COLLECTION);
  const completed = await aliases.findOne(
    { _id: normalizedLid, jid: normalizedJid },
    { projection: { migrationVersion: 1 } },
  );
  if (completed?.migrationVersion === IDENTITY_MIGRATION_VERSION) return true;

  let migrationSucceeded = true;
  if (!(await migrateUserIdentityDocuments(normalizedLid, normalizedJid, db))) {
    migrationSucceeded = false;
  }
  if (!(await reconcileRegisteredIdentityProfile(normalizedLid, normalizedJid, db))) {
    migrationSucceeded = false;
  }

  for (const colName of ["mn_pokemon_users", "mn_guild_members"]) {
    try {
      const col = db.collection(colName);
      const lidDoc = await col.findOne({ _id: normalizedLid });
      if (!lidDoc) continue;
      const jidDoc = await col.findOne({ _id: normalizedJid });
      if (!jidDoc) {
        const { _id: ignoredId, ...copy } = lidDoc;
        await col.insertOne({ ...copy, _id: normalizedJid, migratedFrom: normalizedLid, migratedAt: new Date() });
        const deleted = await col.deleteOne({ _id: normalizedLid });
        if (deleted.deletedCount === 0) migrationSucceeded = false;
      }
    } catch {
      migrationSucceeded = false;
    }
  }

  try {
    if (!(await migrateCardUserIdentity(normalizedLid, normalizedJid, db))) migrationSucceeded = false;
  } catch {
    migrationSucceeded = false;
  }

  const migrationTasks = [
    ...USER_DOCUMENT_COLLECTIONS.map((config) => () =>
      migrateKeyedUserDocuments(config, normalizedLid, normalizedJid, db)),
    ...USER_REFERENCE_COLLECTIONS.map((config) => () =>
      migrateUserReferences(config, normalizedLid, normalizedJid, db)),
    ...["guilds", "guildWars", "web_battle_rooms", "lottery_announcements"].map((collectionName) => () =>
      migrateNestedUserReferences(collectionName, normalizedLid, normalizedJid, db)),
    ...["warns", "antilinkWarns"].map((collectionName) => () =>
      migrateGroupWarningIdentity(collectionName, normalizedLid, normalizedJid, db)),
    () => migrateLotteryIdentity(normalizedLid, normalizedJid, db),
  ];
  if (!(await runIdentityMigrations(migrationTasks))) migrationSucceeded = false;

  if (migrationSucceeded) {
    const result = await aliases.updateOne(
      { _id: normalizedLid },
      { $set: { jid: normalizedJid, migrationVersion: IDENTITY_MIGRATION_VERSION, migrationCompletedAt: new Date() } },
      { upsert: true },
    );
    if (result?.acknowledged === false) migrationSucceeded = false;
  }
  return migrationSucceeded;
}
function legacyIdentityVariants(lid) {
  const normalized = normalizeJid(lid);
  const local = normalized.split("@")[0] || "";
  const digits = bareJidNumber(normalized);
  return [...new Set([
    String(lid || "").trim(),
    normalized,
    local,
    digits ? `${digits}@lid` : "",
    digits ? `${digits}:0@lid` : "",
  ].filter(Boolean))];
}

function identityKeyValue(format, jid) {
  return format === "digits" ? bareJidNumber(jid) : normalizeJid(jid);
}

function isEmptyIdentityValue(value) {
  return value === null || value === undefined || value === "";
}

function stableArrayMerge(primary = [], secondary = [], { preserveDuplicates = false } = {}) {
  const result = [];
  const seen = new Set();
  for (const value of [...primary, ...secondary]) {
    const key = value && typeof value === "object"
      ? (value.ownedId ? `owned:${value.ownedId}` : JSON.stringify(value))
      : `${typeof value}:${String(value)}`;
    if (!preserveDuplicates && seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function mergeMigratedUserDocument(source, destination, config, lid, jid) {
  const { _id: ignoredSourceId, ...sourceFields } = source || {};
  const { _id: destinationId, ...destinationFields } = destination || {};
  const merged = { ...destinationFields, ...sourceFields, _id: destinationId };
  const conflicts = {
    ...(destinationFields.identityMigrationConflicts || {}),
    ...(sourceFields.identityMigrationConflicts || {}),
  };
  const sourceConflicts = {};

  for (const [key, destinationValue] of Object.entries(destinationFields)) {
    if (
      key === config.key ||
      key === "identityMigrationConflicts" ||
      isEmptyIdentityValue(destinationValue) ||
      isEmptyIdentityValue(sourceFields[key])
    ) continue;

    if (Array.isArray(sourceFields[key]) && Array.isArray(destinationValue)) {
      if (config.merge === "pokemonTrainer" && ["party", "pc", "badges"].includes(key)) {
        merged[key] = stableArrayMerge(sourceFields[key], destinationValue);
      } else if (config.merge === "dbzPlayer" && ["techniques", "transformationsUnlocked"].includes(key)) {
        merged[key] = stableArrayMerge(sourceFields[key], destinationValue);
      } else if (config.merge === "dbzPlayer" && key === "inventory") {
        merged[key] = stableArrayMerge(sourceFields[key], destinationValue, { preserveDuplicates: true });
      } else if (config.merge === "ptcgPlayer" && key === "cards") {
        merged[key] = stableArrayMerge(sourceFields[key], destinationValue);
      } else if (config.merge === "akiraMemory" && ["history", "aliases"].includes(key)) {
        const combined = stableArrayMerge(sourceFields[key], destinationValue);
        merged[key] = key === "history"
          ? combined.sort((a, b) => Number(a?.ts || 0) - Number(b?.ts || 0)).slice(-60)
          : combined.slice(-8);
      } else if (sourceFields[key].length === 0) {
        merged[key] = destinationValue;
      } else if (!isDeepStrictEqual(sourceFields[key], destinationValue)) {
        sourceConflicts[key] = destinationValue;
      }
    } else if (
      config.merge === "pokemonTrainer" &&
      key === "inventory" &&
      sourceFields[key] &&
      destinationValue &&
      typeof sourceFields[key] === "object" &&
      typeof destinationValue === "object"
    ) {
      merged[key] = { ...destinationValue, ...sourceFields[key] };
      const itemConflicts = {};
      for (const [item, quantity] of Object.entries(destinationValue)) {
        if (
          Object.hasOwn(sourceFields[key], item) &&
          Number.isFinite(Number(sourceFields[key][item])) &&
          Number.isFinite(Number(quantity))
        ) {
          merged[key][item] = Number(sourceFields[key][item]) + Number(quantity);
        } else if (
          Object.hasOwn(sourceFields[key], item) &&
          !isDeepStrictEqual(sourceFields[key][item], quantity)
        ) {
          itemConflicts[item] = quantity;
        }
      }
      if (Object.keys(itemConflicts).length) sourceConflicts[key] = itemConflicts;
    } else if (!isDeepStrictEqual(sourceFields[key], destinationValue)) {
      sourceConflicts[key] = destinationValue;
    }
  }

  if (config.merge === "pokemonTrainer") {
    if (Array.isArray(merged.party) || Array.isArray(merged.pc)) {
      merged.pokemonCount =
        (Array.isArray(merged.party) ? merged.party.length : 0) +
        (Array.isArray(merged.pc) ? merged.pc.length : 0);
    }
  }
  if (config.merge === "ptcgPlayer") {
    for (const key of ["packsOpened", "cardsPulled"]) {
      if (Number.isFinite(Number(sourceFields[key])) && Number.isFinite(Number(destinationFields[key]))) {
        merged[key] = Number(sourceFields[key]) + Number(destinationFields[key]);
      }
    }
    if (Array.isArray(merged.cards)) {
      merged.cardsPulled = Math.max(Number(merged.cardsPulled || 0), merged.cards.length);
    }
  }
  if (config.merge === "akiraMemory" && Array.isArray(merged.history)) {
    merged.messageCount =
      Number(sourceFields.messageCount || 0) +
      Number(destinationFields.messageCount || 0);
    merged.messageCount = Math.max(merged.messageCount, Math.ceil(merged.history.length / 2));
  }
  if (config.merge === "cooldown") {
    merged.lastPvp = Math.max(
      Number(sourceFields.lastPvp || 0),
      Number(destinationFields.lastPvp || 0),
    );
  }

  if (Object.keys(sourceConflicts).length) {
    conflicts[lid] = { ...(conflicts[lid] || {}), ...sourceConflicts };
  }
  if (Object.keys(conflicts).length) merged.identityMigrationConflicts = conflicts;
  merged.migratedFrom = lid;
  merged.migratedAt = new Date();
  if (config.key !== "_id") merged[config.key] = identityKeyValue(config.format || "jid", jid);
  return merged;
}

async function migrateKeyedUserDocuments(config, lid, jid, db) {
  const collection = db.collection(config.name);
  const targetValue = identityKeyValue(config.format || "jid", jid);
  const sourceValues = legacyIdentityVariants(lid);
  const sources = await collection.find({ [config.key]: { $in: sourceValues } }).toArray();
  let succeeded = true;

  for (const source of sources) {
    if (config.key === "_id" && String(source._id) === targetValue) continue;
    const normalizedSource = replaceNestedUserReferences(source, sourceValues, jid);
    const destination = await collection.findOne({ [config.key]: targetValue });
    if (!destination) {
      if (config.key === "_id") {
        const { _id: ignoredId, ...copy } = normalizedSource;
        try {
          await collection.insertOne({
            ...copy,
            _id: targetValue,
            migratedFrom: lid,
            migratedAt: new Date(),
          });
          const deleted = await collection.deleteOne({ _id: source._id });
          if (deleted.deletedCount === 0) succeeded = false;
        } catch {
          // Keep the source document if another process created the target.
          if (!(await collection.findOne({ _id: targetValue }))) succeeded = false;
        }
      } else {
        const changedFields = {};
        for (const [key, value] of Object.entries(normalizedSource)) {
          if (key !== "_id" && !isDeepStrictEqual(value, source[key])) {
            changedFields[key] = value;
          }
        }
        changedFields[config.key] = targetValue;
        changedFields.migratedFrom = lid;
        changedFields.migratedAt = new Date();
        const result = await collection.updateOne(
          { _id: source._id, [config.key]: source[config.key] },
          { $set: changedFields },
        );
        if (result.matchedCount === 0) succeeded = false;
      }
      continue;
    }
    if (String(destination._id) === String(source._id)) continue;

    const normalizedDestination = replaceNestedUserReferences(destination, sourceValues, jid);
    const merged = mergeMigratedUserDocument(
      normalizedSource,
      normalizedDestination,
      config,
      lid,
      jid,
    );
    const replaced = await collection.replaceOne({ _id: destination._id }, merged);
    if (replaced.matchedCount === 0) {
      succeeded = false;
      continue;
    }
    const deleted = await collection.deleteOne({ _id: source._id });
    if (deleted.deletedCount === 0) succeeded = false;
  }
  return succeeded;
}

async function migrateUserReferences(config, lid, jid, db) {
  const collection = db.collection(config.name);
  const variants = legacyIdentityVariants(lid);
  const fields = Object.entries(config.fields || {});
  const arrays = Object.entries(config.arrays || {});
  let succeeded = true;

  for (const [field, format] of fields) {
    const result = await collection.updateMany(
      { [field]: { $in: variants } },
      { $set: { [field]: identityKeyValue(format, jid) } },
    );
    if (result?.acknowledged === false) succeeded = false;
  }

  for (const [field, format] of arrays) {
    const documents = await collection.find({ [field]: { $in: variants } }).toArray();
    for (const doc of documents) {
      const updated = stableArrayMerge(
        (Array.isArray(doc[field]) ? doc[field] : []).filter((value) => !variants.includes(value)),
        [identityKeyValue(format, jid)],
      );
      const result = await collection.updateOne(
        { _id: doc._id, [field]: { $in: variants } },
        { $set: { [field]: updated } },
      );
      if (result.matchedCount === 0) succeeded = false;
    }
  }
  return succeeded;
}

const NESTED_IDENTITY_KEYS = new Set([
  "owner", "ownerJid", "creatorJid", "winnerJid", "createdBy", "acceptedBy",
  "reportedBy", "by", "jid", "userJid", "fromJid", "toJid", "sellerJid",
  "invitedOpponentId", "winnerId", "userId", "id",
]);

const NESTED_IDENTITY_PATHS = {
  guilds: ["owner", "members"],
  guildWars: [
    "createdBy", "acceptedBy", "guildA.owner", "guildB.owner",
    "matchups.reportedBy", "matchups.a.jid", "matchups.b.jid",
  ],
  web_battle_rooms: [
    "challenger.id", "opponent.id", "invitedOpponentId",
    "spectatorIds", "winnerId",
  ],
  lottery_announcements: ["payload.mentions", "payload.winners.userId"],
};

function replaceNestedUserReferences(value, variants, jid) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceNestedUserReferences(item, variants, jid));
  }
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  const next = { ...value };
  for (const [key, item] of Object.entries(value)) {
    if (NESTED_IDENTITY_KEYS.has(key) && typeof item === "string" && variants.includes(item)) {
      next[key] = normalizeJid(jid);
    } else if (key === "members" || key === "participants" || key === "spectatorIds" || key === "mentions") {
      next[key] = stableArrayMerge(
        (Array.isArray(item) ? item : []).map((member) =>
          typeof member === "string" && variants.includes(member) ? normalizeJid(jid) : member
        ),
      );
    } else if (item && typeof item === "object") {
      next[key] = replaceNestedUserReferences(item, variants, jid);
    }
  }
  return next;
}

async function migrateNestedUserReferences(collectionName, lid, jid, db) {
  const collection = db.collection(collectionName);
  const variants = legacyIdentityVariants(lid);
  const paths = NESTED_IDENTITY_PATHS[collectionName] || [];
  const documents = await collection.find({
    $or: paths.map((path) => ({ [path]: { $in: variants } })),
  }).toArray();
  let succeeded = true;
  for (const doc of documents) {
    const updated = replaceNestedUserReferences(doc, variants, jid);
    const changedFields = {};
    for (const key of Object.keys(updated)) {
      if (key !== "_id" && !isDeepStrictEqual(updated[key], doc[key])) {
        changedFields[key] = updated[key];
      }
    }
    if (!Object.keys(changedFields).length) continue;
    const result = await collection.updateOne(
      { _id: doc._id },
      { $set: changedFields },
    );
    if (result.matchedCount === 0) succeeded = false;
  }
  return succeeded;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function migrateGroupWarningIdentity(collectionName, lid, jid, db) {
  const collection = db.collection(collectionName);
  const variants = legacyIdentityVariants(lid);
  const suffixes = [...new Set([normalizeJid(lid), bareJidNumber(lid)])].filter(Boolean);
  const suffixPattern = suffixes.map(escapeRegex).join("|");
  const sources = await collection.find({
    _id: { $regex: `:(?:${suffixPattern})$` },
  }).toArray();
  let succeeded = true;

  for (const source of sources) {
    const oldId = String(source._id || "");
    const separator = oldId.lastIndexOf(":");
    if (separator < 0) continue;
    const oldUserId = oldId.slice(separator + 1);
    if (!variants.includes(oldUserId)) continue;
    const targetId = `${oldId.slice(0, separator)}:${normalizeJid(jid)}`;
    const normalizedSource = replaceNestedUserReferences(source, variants, jid);
    const destination = await collection.findOne({ _id: targetId });
    if (!destination) {
      const { _id: ignoredId, ...copy } = normalizedSource;
      try {
        await collection.insertOne({ ...copy, _id: targetId, migratedFrom: oldId });
        const deleted = await collection.deleteOne({ _id: oldId });
        if (deleted.deletedCount === 0) succeeded = false;
      } catch {
        if (!(await collection.findOne({ _id: targetId }))) succeeded = false;
      }
      continue;
    }

    const normalizedDestination = replaceNestedUserReferences(destination, variants, jid);
    const warningEntries = stableArrayMerge(
      normalizedSource.warnings || [],
      normalizedDestination.warnings || [],
    );
    const merged = {
      ...normalizedDestination,
      ...normalizedSource,
      _id: targetId,
      count: Math.max(
        Number(normalizedSource.count || 0),
        Number(normalizedDestination.count || 0),
        warningEntries.length,
      ),
      migratedFrom: oldId,
      migratedAt: new Date(),
    };
    if (warningEntries.length) merged.warnings = warningEntries;
    const replaced = await collection.replaceOne({ _id: targetId }, merged);
    if (replaced.matchedCount === 0) {
      succeeded = false;
      continue;
    }
    const deleted = await collection.deleteOne({ _id: oldId });
    if (deleted.deletedCount === 0) succeeded = false;
  }
  return succeeded;
}

async function migrateLotteryIdentity(lid, jid, db) {
  const lottery = db.collection("lottery");
  const round = await lottery.findOne({ _id: "current" });
  if (!round || !Array.isArray(round.tickets)) return true;
  const variants = legacyIdentityVariants(lid);
  const phoneDigits = bareJidNumber(jid);
  let changed = false;
  const tickets = round.tickets.map((ticket) => {
    if (!variants.includes(String(ticket?.userId || ""))) return ticket;
    changed = true;
    return { ...ticket, userId: phoneDigits };
  });
  if (!changed) return true;
  const result = await lottery.updateOne(
    { _id: "current" },
    { $set: { tickets } },
  );
  return result.matchedCount > 0;
}

export async function migrateCardUserIdentity(lid, jid, db) {
  if (!lid?.endsWith("@lid") || !jid?.endsWith("@s.whatsapp.net") || !db) return false;

  const lidUserId = bareJidNumber(lid);
  const phoneUserId = bareJidNumber(jid);
  if (!lidUserId || !phoneUserId || lidUserId === phoneUserId) return true;

  const users = db.collection("mn_users");
  const legacyUser = await users.findOne({ userId: lidUserId });
  if (!legacyUser) return true;

  const phoneUser = await users.findOne({ userId: phoneUserId });
  const migratedAt = new Date();
  if (!phoneUser) {
    const result = await users.updateOne(
      { _id: legacyUser._id, userId: lidUserId },
      {
        $set: {
          userId: phoneUserId,
          whatsappNumber: normalizeJid(jid),
          migratedFrom: lid,
          migratedAt,
        },
      },
    );
    return result.matchedCount > 0;
  }

  const merged = mergeCardUserDocuments(
    legacyUser,
    phoneUser,
    lid,
    jid,
    lidUserId,
    phoneUserId,
    migratedAt,
  );
  const replaced = await users.replaceOne(
    { _id: phoneUser._id, userId: phoneUserId },
    merged,
  );
  if (replaced.matchedCount === 0) return false;

  const deleted = await users.deleteOne({
    _id: legacyUser._id,
    userId: lidUserId,
  });
  return deleted.deletedCount > 0;
}

function mergeCardUserDocuments(legacyUser, phoneUser, lid, jid, lidUserId, phoneUserId, migratedAt) {
  const { _id: ignoredLegacyId, ...legacyFields } = legacyUser;
  const { _id: phoneDocumentId, ...phoneFields } = phoneUser;
  const merged = {
    ...phoneFields,
    ...legacyFields,
    _id: phoneDocumentId,
    userId: phoneUserId,
    whatsappNumber: normalizeJid(jid),
    migratedFrom: lid,
    migratedAt,
  };
  const oldCards = Array.isArray(legacyUser.cards) ? legacyUser.cards : [];
  const phoneCards = Array.isArray(phoneUser.cards) ? phoneUser.cards : [];
  merged.cards = [...oldCards, ...phoneCards];
  merged.totalCards = merged.cards.length;

  const conflicts = {};
  for (const [key, value] of Object.entries(phoneFields)) {
    if (
      !["identityMigrationConflicts", "cards", "totalCards", "userId", "whatsappNumber"].includes(key) &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Object.hasOwn(legacyFields, key) &&
      !isDeepStrictEqual(value, legacyFields[key])
    ) {
      conflicts[key] = value;
    }
  }
  const existingConflicts = {
    ...(phoneFields.identityMigrationConflicts || {}),
    ...(legacyFields.identityMigrationConflicts || {}),
  };
  if (Object.keys(conflicts).length > 0) {
    merged.identityMigrationConflicts = {
      ...existingConflicts,
      [lid]: conflicts,
    };
  } else if (Object.keys(existingConflicts).length > 0) {
    merged.identityMigrationConflicts = existingConflicts;
  }

  return merged;
}

export function mergeRegisteredIdentityDocuments(lidDoc, jidDoc, lid, jid, migratedAt = new Date()) {
  const { _id: ignoredLidId, ...legacyFields } = lidDoc || {};
  const { _id: ignoredJidId, ...phoneFields } = jidDoc || {};
  const conflicts = {};

  for (const [key, value] of Object.entries(phoneFields)) {
    if (
      key !== "identityMigrationConflicts" &&
      Object.hasOwn(legacyFields, key) &&
      !isDeepStrictEqual(value, legacyFields[key])
    ) {
      conflicts[key] = value;
    }
  }

  const existingConflicts = {
    ...(phoneFields.identityMigrationConflicts || {}),
    ...(legacyFields.identityMigrationConflicts || {}),
  };
  const merged = {
    ...phoneFields,
    ...legacyFields,
    ...preferredUserProfileFields(legacyFields, phoneFields),
    _id: jid,
    migratedFrom: lid,
    migratedAt,
  };
  if (legacyFields.registered === true || phoneFields.registered === true) {
    merged.registered = true;
  }

  if (Object.keys(conflicts).length > 0) {
    merged.identityMigrationConflicts = {
      ...existingConflicts,
      [lid]: conflicts,
    };
  } else if (Object.keys(existingConflicts).length > 0) {
    merged.identityMigrationConflicts = existingConflicts;
  }

  return merged;
}

function hasMeaningfulProfileValue(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && !["n/a", "na", "unknown", "user", "none", "not set"].includes(normalized);
  }
  return value !== null && value !== undefined;
}

function profileCompleteness(document = {}) {
  return USER_PROFILE_FIELDS.reduce(
    (score, field) => score + (hasMeaningfulProfileValue(document[field]) ? 1 : 0),
    0,
  );
}

function preferredUserProfileFields(primary = {}, secondary = {}) {
  // Prefer the more complete user-entered profile (such as KELIN.PYT with
  // birthday and bio); on a tie, retain the established LID-source priority.
  const preferred = profileCompleteness(secondary) > profileCompleteness(primary)
    ? secondary
    : primary;
  const fallback = preferred === primary ? secondary : primary;
  const fields = {};

  for (const field of USER_PROFILE_FIELDS) {
    const preferredValue = preferred[field];
    const fallbackValue = fallback[field];
    const value = hasMeaningfulProfileValue(preferredValue)
      ? preferredValue
      : hasMeaningfulProfileValue(fallbackValue)
        ? fallbackValue
        : preferredValue !== undefined
          ? preferredValue
          : fallbackValue;
    if (value !== undefined) fields[field] = value;
  }

  return fields;
}

async function reconcileRegisteredIdentityProfile(lid, jid, db) {
  const users = db.collection("users");
  const current = await users.findOne({ _id: jid });
  if (!current) return true;

  // Previous migrations keep the displaced phone-keyed values here. Revisit
  // them when the merge policy changes, even though the old LID document was
  // already removed.
  const previousIdentity = current.identityMigrationConflicts?.[lid];
  if (!previousIdentity || typeof previousIdentity !== "object") return true;

  const preferred = preferredUserProfileFields(current, previousIdentity);
  const updates = {};
  for (const [field, value] of Object.entries(preferred)) {
    if (!isDeepStrictEqual(current[field], value)) updates[field] = value;
  }
  if (Object.keys(updates).length === 0) return true;

  const result = await users.updateOne({ _id: jid }, { $set: updates });
  return result.matchedCount > 0;
}

export async function resolveJidToLid(sender, sock, database = null) {
  const jid = normalizeJid(sender);
  if (!jid.endsWith("@s.whatsapp.net") || !sock) return "";

  const cacheKey = `phone:${jid}`;
  const cached = readIdentityResolution(sock, cacheKey);
  if (cached.hit) return cached.value;

  let resolvedLid = "";
  try {
    const mapping = sock.signalRepository?.lidMapping;
    if (typeof mapping?.getLIDForPN === "function") {
      const lid = await mapping.getLIDForPN(jid);
      if (lid && String(lid).endsWith("@lid")) resolvedLid = normalizeJid(String(lid));
    }

    if (!resolvedLid && typeof mapping?.getLIDsForPNs === "function") {
      const mapped = await mapping.getLIDsForPNs([jid]);
      const lid = mapped instanceof Map
        ? mapped.get(jid) || mapped.get(bareJidNumber(jid))
        : Array.isArray(mapped)
          ? mapped[0]?.lid || mapped[0]?.lidJid || mapped[0]
          : mapped?.[jid] || mapped?.[bareJidNumber(jid)];
      if (lid && String(lid).endsWith("@lid")) resolvedLid = normalizeJid(String(lid));
    }
  } catch {
    // Reverse mapping is optional and must not block phone-JID handling.
  }

  if (!resolvedLid) {
    try {
      const db = database || await getDb();
      const alias = await db.collection(IDENTITY_ALIAS_COLLECTION).findOne(
        { jid },
        { projection: { _id: 1 } },
      );
      const aliasLid = normalizeJid(String(alias?._id || ""));
      if (aliasLid.endsWith("@lid")) resolvedLid = aliasLid;

      if (!resolvedLid) {
        // Keep compatibility with accounts migrated before durable aliases were added.
        const user = await db.collection("users").findOne(
          { _id: jid },
          { projection: { migratedFrom: 1 } },
        );
        const migratedFrom = normalizeJid(String(user?.migratedFrom || ""));
        if (migratedFrom.endsWith("@lid")) resolvedLid = migratedFrom;
      }
    } catch {
      // A missing DB or old account record must not block phone-JID handling.
    }
  }

  if (resolvedLid) {
    rememberIdentityMapping(sock, resolvedLid, jid);
    return resolvedLid;
  }

  cacheIdentityResolution(sock, cacheKey, "");
  return "";
}

export async function rememberIdentityAlias(lid, jid, database = null) {
  const normalizedLid = normalizeJid(String(lid || ""));
  const normalizedJid = normalizeJid(String(jid || ""));
  if (!normalizedLid.endsWith("@lid") || !normalizedJid.endsWith("@s.whatsapp.net")) return false;

  try {
    const db = database || await getDb();
    const saved = await db.collection(IDENTITY_ALIAS_COLLECTION).updateOne(
      { _id: normalizedLid },
      { $set: { jid: normalizedJid, updatedAt: new Date() } },
      { upsert: true },
    );
    if (saved?.acknowledged === false) return false;

    // Retain the account's phone aliases when a registered LID profile exists.
    await db.collection("users").updateOne(
      { _id: normalizedLid, registered: true },
      { $set: phoneIdentityFields(normalizedJid) },
    ).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export async function resolveAndMigrateIdentity(sender, sock, chatId, alternateSender = "", database = null) {
  const resolvedJid = await resolveLidToJid(sender, sock, chatId, alternateSender, database);
  const sourceLid = sender?.endsWith("@lid")
    ? normalizeJid(sender)
    : alternateSender?.endsWith("@lid")
      ? normalizeJid(alternateSender)
      : await resolveJidToLid(resolvedJid, sock, database);

  if (sourceLid && resolvedJid.endsWith("@s.whatsapp.net")) {
    try {
      rememberIdentityMapping(sock, sourceLid, resolvedJid);
      const cache = getIdentityMigrationCache(sock);
      const inFlight = getIdentityMigrationInFlight(sock);
      const cacheKey = `${sourceLid}\u0000${resolvedJid}`;
      const cachedUntil = cache?.get(cacheKey) || 0;
      if (cachedUntil <= Date.now()) {
        let migration = inFlight?.get(cacheKey);
        if (!migration) {
          migration = (async () => {
            const aliasSaved = await rememberIdentityAlias(sourceLid, resolvedJid, database);
            const migrationSucceeded = await migrateLidData(sourceLid, resolvedJid, database);
            return aliasSaved && migrationSucceeded;
          })();
          inFlight?.set(cacheKey, migration);
        }

        try {
          const migrationSucceeded = await migration;
          if (migrationSucceeded && cache) {
            if (cache.size >= 2048) {
              const now = Date.now();
              for (const [key, expiresAt] of cache) {
                if (expiresAt <= now) cache.delete(key);
              }
              if (cache.size >= 2048) cache.delete(cache.keys().next().value);
            }
            cache.set(cacheKey, Date.now() + IDENTITY_MIGRATION_CACHE_MS);
          }
        } finally {
          if (inFlight?.get(cacheKey) === migration) inFlight.delete(cacheKey);
        }
      }
    } catch {
      // Identity repair is best-effort during command routing.
    }
  }

  return resolvedJid;
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
      await rememberIdentityAlias(lid, jid);
      await migrateLidData(lid, jid);
    }
  }
}
