/**
 * KELIN MD — Identity Normalization
 * Handles JID/LID mapping to ensure users don't lose data when WhatsApp
 * switches their identity in groups.
 */
import { getDb } from "./mongo.mjs";
import { isDeepStrictEqual } from "node:util";

const identityMigrationCache = new WeakMap();
const IDENTITY_MIGRATION_CACHE_MS = 5 * 60 * 1000;

function getIdentityMigrationCache(sock) {
  let cache = identityMigrationCache.get(sock);
  if (!cache) {
    cache = new Map();
    identityMigrationCache.set(sock, cache);
  }
  return cache;
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
 * Resolve an LID to a JID (phone number).
 * Prefer Baileys' native mapping, with group metadata as a legacy fallback.
 */
export async function resolveLidToJid(sender, sock, chatId, alternateSender = "") {
  if (!sender || !sender.endsWith("@lid")) return normalizeJid(sender);
  if (!sock) return normalizeJid(sender);

  try {
    if (/@(?:s\.whatsapp\.net|c\.us)$/i.test(String(alternateSender || ""))) {
      return normalizeJid(alternateSender);
    }

    const lidNum = bareJidNumber(sender);
    const mapping = sock.signalRepository?.lidMapping;

    if (typeof mapping?.getPNForLID === "function") {
      const phoneJid = await mapping.getPNForLID(`${lidNum}@lid`);
      const canonicalPhoneJid = asPhoneJid(phoneJid);
      if (canonicalPhoneJid) return canonicalPhoneJid;
    }

    if (typeof mapping?.getPNsForLIDs === "function") {
      const mapped = await mapping.getPNsForLIDs([`${lidNum}@lid`]);
      const phoneJid = mapped instanceof Map
        ? mapped.get(`${lidNum}@lid`) || mapped.get(lidNum)
        : Array.isArray(mapped)
          ? mapped[0]?.pn || mapped[0]?.phoneNumber || mapped[0]
          : mapped?.[`${lidNum}@lid`] || mapped?.[lidNum];
      const canonicalPhoneJid = asPhoneJid(phoneJid);
      if (canonicalPhoneJid) return canonicalPhoneJid;
    }

    if (chatId?.endsWith("@g.us") && typeof sock.groupMetadata === "function") {
      const meta = await sock.groupMetadata(chatId);
      for (const participant of meta.participants || []) {
        if (bareJidNumber(participant?.lid) === lidNum && participant?.id) {
          const canonicalPhoneJid = asPhoneJid(participant.id);
          if (canonicalPhoneJid) return canonicalPhoneJid;
        }
      }
    }

    // Check if it's the bot itself
    const botLid = sock.user?.lid || "";
    if (botLid && bareJidNumber(botLid) === lidNum && sock.user?.id) {
      const canonicalPhoneJid = asPhoneJid(sock.user.id);
      if (canonicalPhoneJid) return canonicalPhoneJid;
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
 * Migrate data from an LID record to a JID record if the JID record doesn't exist.
 * This is called when we first successfully resolve an LID to a JID.
 */
export async function migrateLidData(lid, jid) {
  if (!lid.endsWith("@lid") || !jid.endsWith("@s.whatsapp.net")) return;
  
  const db = await getDb();
  const collections = ["users", "mn_users", "mn_pokemon_users", "mn_guild_members"];
  let migrationSucceeded = true;
  
  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      const lidDoc = await col.findOne({ _id: lid });
      if (lidDoc) {
        const jidDoc = await col.findOne({ _id: jid });
        if (!jidDoc) {
          // MongoDB _id is immutable. Copy first, then remove the old key.
          const { _id: ignoredId, ...copy } = lidDoc;
          await col.insertOne({ ...copy, _id: jid, migratedFrom: lid, migratedAt: new Date() });
          await col.deleteOne({ _id: lid });
        } else if (colName === "users" && lidDoc.registered === true) {
          // The LID record is the user's existing account. Keep its values
          // readable at the canonical phone JID while preserving any
          // conflicting phone-keyed values for recovery instead of silently
          // discarding either record.
          const merged = mergeRegisteredIdentityDocuments(lidDoc, jidDoc, lid, jid);
          const result = await col.replaceOne({ _id: jid }, merged);
          if (result.matchedCount > 0) await col.deleteOne({ _id: lid });
        } else if (lidDoc.registered === true && jidDoc.registered !== true) {
          const { _id: ignoredId, ...copy } = lidDoc;
          const preserved = Object.fromEntries(
            Object.entries(jidDoc).filter(([key]) =>
              key !== "_id" && key !== "registered" && key !== "registeredAt"
            ),
          );
          await col.replaceOne(
            { _id: jid },
            {
              ...copy,
              ...preserved,
              _id: jid,
              registered: true,
              migratedFrom: lid,
              migratedAt: new Date(),
            },
          );
          await col.deleteOne({ _id: lid });
        } else {
          // Both exist — leave the records untouched rather than risking loss.
        }
      }
    } catch {
      // A concurrent command may have created the destination between reads.
      migrationSucceeded = false;
    }
  }
  return migrationSucceeded;
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
    _id: jid,
    migratedFrom: lid,
    migratedAt,
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

export async function resolveJidToLid(sender, sock) {
  const jid = normalizeJid(sender);
  if (!jid.endsWith("@s.whatsapp.net") || !sock) return "";

  try {
    const mapping = sock.signalRepository?.lidMapping;
    if (typeof mapping?.getLIDForPN === "function") {
      const lid = await mapping.getLIDForPN(jid);
      if (lid && String(lid).endsWith("@lid")) return normalizeJid(String(lid));
    }

    if (typeof mapping?.getLIDsForPNs === "function") {
      const mapped = await mapping.getLIDsForPNs([jid]);
      const lid = mapped instanceof Map
        ? mapped.get(jid) || mapped.get(bareJidNumber(jid))
        : Array.isArray(mapped)
          ? mapped[0]?.lid || mapped[0]?.lidJid || mapped[0]
          : mapped?.[jid] || mapped?.[bareJidNumber(jid)];
      if (lid && String(lid).endsWith("@lid")) return normalizeJid(String(lid));
    }
  } catch {
    // Reverse mapping is optional and must not block phone-JID handling.
  }

  return "";
}

export async function rememberIdentityAlias(lid, jid) {
  if (!lid?.endsWith("@lid") || !jid?.endsWith("@s.whatsapp.net")) return false;

  try {
    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: normalizeJid(lid), registered: true },
      {
        $set: {
          ...phoneIdentityFields(jid),
        },
      },
    );
    return true;
  } catch {
    // Alias persistence is best-effort; command handling still uses the JID.
    return false;
  }
}

export async function resolveAndMigrateIdentity(sender, sock, chatId, alternateSender = "") {
  const resolvedJid = await resolveLidToJid(sender, sock, chatId, alternateSender);
  const sourceLid = sender?.endsWith("@lid")
    ? normalizeJid(sender)
    : alternateSender?.endsWith("@lid")
      ? normalizeJid(alternateSender)
      : await resolveJidToLid(resolvedJid, sock);

  if (sourceLid && resolvedJid.endsWith("@s.whatsapp.net")) {
    try {
      const cache = getIdentityMigrationCache(sock);
      const cacheKey = `${sourceLid}\u0000${resolvedJid}`;
      const cachedUntil = cache.get(cacheKey) || 0;
      if (cachedUntil <= Date.now()) {
        const aliasSaved = await rememberIdentityAlias(sourceLid, resolvedJid);
        const migrationSucceeded = await migrateLidData(sourceLid, resolvedJid);
        if (aliasSaved && migrationSucceeded) {
          if (cache.size >= 2048) {
            const now = Date.now();
            for (const [key, expiresAt] of cache) {
              if (expiresAt <= now) cache.delete(key);
            }
            if (cache.size >= 2048) cache.delete(cache.keys().next().value);
          }
          cache.set(cacheKey, Date.now() + IDENTITY_MIGRATION_CACHE_MS);
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
