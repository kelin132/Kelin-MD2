/**
 * KELIN MD — Identity Normalization
 * Handles JID/LID mapping to ensure users don't lose data when WhatsApp
 * switches their identity in groups.
 */
import { getDb } from "./mongo.mjs";

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
    digits,
    digits && isLid ? `${digits}@lid` : "",
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
  if (!sender || !sender.endsWith("@lid")) return normalizeJid(sender);
  if (!sock) return normalizeJid(sender);

  try {
    if (alternateSender && !alternateSender.endsWith("@lid")) {
      return normalizeJid(alternateSender);
    }

    const lidNum = bareJidNumber(sender);
    const mapping = sock.signalRepository?.lidMapping;

    if (typeof mapping?.getPNForLID === "function") {
      const phoneJid = await mapping.getPNForLID(`${lidNum}@lid`);
      if (phoneJid && !String(phoneJid).endsWith("@lid")) {
        return normalizeJid(String(phoneJid));
      }
    }

    if (typeof mapping?.getPNsForLIDs === "function") {
      const mapped = await mapping.getPNsForLIDs([`${lidNum}@lid`]);
      const phoneJid = mapped instanceof Map
        ? mapped.get(`${lidNum}@lid`) || mapped.get(lidNum)
        : Array.isArray(mapped)
          ? mapped[0]?.pn || mapped[0]?.phoneNumber || mapped[0]
          : mapped?.[`${lidNum}@lid`] || mapped?.[lidNum];
      if (phoneJid && !String(phoneJid).endsWith("@lid")) {
        return normalizeJid(String(phoneJid));
      }
    }

    if (chatId?.endsWith("@g.us") && typeof sock.groupMetadata === "function") {
      const meta = await sock.groupMetadata(chatId);
      for (const participant of meta.participants || []) {
        if (bareJidNumber(participant?.lid) === lidNum && participant?.id) {
          return normalizeJid(participant.id);
        }
      }
    }

    // Check if it's the bot itself
    const botLid = sock.user?.lid || "";
    if (botLid && bareJidNumber(botLid) === lidNum && sock.user?.id) {
      return normalizeJid(sock.user.id);
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
    }
  }
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
  if (!lid?.endsWith("@lid") || !jid?.endsWith("@s.whatsapp.net")) return;

  try {
    const db = await getDb();
    await db.collection("users").updateOne(
      { _id: normalizeJid(lid), registered: true },
      {
        $set: {
          phoneNumber: bareJidNumber(jid),
          whatsappNumber: normalizeJid(jid),
          jid: normalizeJid(jid),
        },
      },
    );
  } catch {
    // Alias persistence is best-effort; command handling still uses the JID.
  }
}

export async function resolveAndMigrateIdentity(sender, sock, chatId, alternateSender = "") {
  const resolvedJid = await resolveLidToJid(sender, sock, chatId, alternateSender);
  const sourceLid = sender?.endsWith("@lid")
    ? normalizeJid(sender)
    : await resolveJidToLid(resolvedJid, sock);

  if (sourceLid && resolvedJid.endsWith("@s.whatsapp.net")) {
    try {
      await rememberIdentityAlias(sourceLid, resolvedJid);
      await migrateLidData(sourceLid, resolvedJid);
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
