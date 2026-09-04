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
  return local.split(":")[0] + "@" + server;
}

export function bareJidNumber(value = "") {
  return String(value || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

/**
 * Return the common legacy spellings of one WhatsApp identity.
 * Older records use raw numbers, @c.us, device-qualified JIDs, or a mix of
 * those forms. Keeping the variants together prevents an identity change from
 * looking like a new account.
 */
export function whatsappIdentityVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const normalized = normalizeJid(raw);
  const [local = "", server = "s.whatsapp.net"] = normalized.split("@");
  const digits = local.replace(/\D/g, "");

  return [...new Set([
    raw,
    normalized,
    normalized.replace(/:\d+(?=@)/, ""),
    digits,
    digits ? `${digits}@${server}` : "",
    digits ? `${digits}@s.whatsapp.net` : "",
    digits ? `${digits}@c.us` : "",
    digits ? `${digits}:0@s.whatsapp.net` : "",
    digits ? `${digits}:0@c.us` : "",
  ].filter(Boolean))];
}

/**
 * Resolve an LID to a JID (phone number).
 * Baileys' native mapping works in private chats as well as groups; group
 * metadata remains the fallback for older sessions and privacy JIDs.
 */
export async function resolveLidToJid(sender, sock, chatId) {
  if (!sender || !sender.endsWith("@lid")) return normalizeJid(sender);
  if (!sock) return normalizeJid(sender);

  try {
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
          // This only runs when the destination is empty.
          const { _id: ignoredId, ...copy } = lidDoc;
          await col.insertOne({ ...copy, _id: jid, migratedFrom: lid, migratedAt: new Date() });
          await col.deleteOne({ _id: lid });
        } else {
          // Both exist — merging is complex and risky, so we just log it for now
          // or we could potentially merge simple numeric fields.
        }
      }
    } catch {
      // A concurrent command may have created the destination between the
      // reads. Leave both records intact rather than risking data loss.
    }
  }
}
