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
  return jid.split(":")[0].split("@")[0] + "@" + (jid.split("@")[1] || "s.whatsapp.net");
}

/**
 * Resolve an LID to a JID (phone number) using group metadata if available.
 */
export async function resolveLidToJid(sender, sock, chatId) {
  if (!sender || !sender.endsWith("@lid")) return normalizeJid(sender);
  if (!sock || !chatId?.endsWith("@g.us")) return normalizeJid(sender);

  try {
    const lidNum = sender.split("@")[0].split(":")[0];
    const meta = await sock.groupMetadata(chatId);
    for (const p of meta.participants || []) {
      if (p.lid && p.lid.split("@")[0].split(":")[0] === lidNum) {
        return normalizeJid(p.id);
      }
    }
    
    // Check if it's the bot itself
    const botLid = sock.user?.lid || "";
    if (botLid && botLid.split("@")[0].split(":")[0] === lidNum) {
      return normalizeJid(sock.user.id);
    }
  } catch (err) {
    // console.error("[identity] Failed to resolve LID:", err.message);
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
          // No JID record yet, rename LID record to JID
          await col.updateOne({ _id: lid }, { $set: { _id: jid, migratedFrom: lid } });
          console.log(`[identity] Migrated ${colName} record from ${lid} to ${jid}`);
        } else {
          // Both exist — merging is complex and risky, so we just log it for now
          // or we could potentially merge simple numeric fields.
          console.warn(`[identity] Both LID and JID records exist for ${jid} in ${colName}. Skipping auto-merge.`);
        }
      }
    } catch (err) {
      console.error(`[identity] Migration failed for ${colName}:`, err.message);
    }
  }
}
