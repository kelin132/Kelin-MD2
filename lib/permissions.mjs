/**
 * KELIN MD — Permission helper
 * Single source of truth for owner / staff / mod / premium / jail checks.
 *
 * Owner detection — three methods (all must be tried):
 *   1. fromMe flag  → the bot's own device sent the message = owner
 *   2. Numeric JID  → strip everything except digits and compare
 *      Handles: 27628114340@s.whatsapp.net, 27628114340:5@s.whatsapp.net
 *   3. @lid group JID → look up participant in group metadata and match owner digit
 *      WhatsApp sends @lid privacy addresses in groups since 2024
 */
import { getDb } from "./mongo.mjs";
import { readData } from "./store.mjs";

/** Strip a JID to bare phone digits: "2762xxx:5@s.whatsapp.net" → "2762xxx" */
function jidDigits(jid = "") {
  return jid.split("@")[0].split(":")[0].replace(/\D/g, "");
}

/**
 * Resolve @lid sender in a group to their real phone number via participant list.
 * Returns the phone-digit string, or the original jidDigits result if lookup fails.
 */
async function resolveLidToDigits(sender, sock, chatId) {
  if (!sender.endsWith("@lid") || !sock || !chatId?.endsWith("@g.us")) {
    return jidDigits(sender);
  }
  try {
    const meta = await sock.groupMetadata(chatId);
    const senderLidNum = jidDigits(sender);
    for (const p of meta.participants || []) {
      const pLidNum = jidDigits(p.lid || "");
      if (pLidNum && pLidNum === senderLidNum) {
        // Found matching LID — return the real JID digits
        return jidDigits(p.id || "");
      }
    }
    // Also check if bot's own LID matches (owner = bot case)
    const botLidNum = jidDigits(sock.user?.lid || "");
    if (botLidNum && botLidNum === senderLidNum) {
      return jidDigits(sock.user?.id || "");
    }
  } catch { /* group metadata unavailable */ }
  return jidDigits(sender);
}

/**
 * Build the full permission context for a sender JID.
 *
 * @param {string}  sender      – full JID e.g. "2637XXXXXXXX@s.whatsapp.net"
 * @param {string}  ownerNumber – raw value e.g. "2637XXXXXXXX" or "+2637XXXXXXXX"
 * @param {object}  [opts]
 * @param {boolean} [opts.fromMe=false]  – msg.key.fromMe (owner sent from their device)
 * @param {object}  [opts.sock]          – Baileys socket (for @lid → real JID lookup)
 * @param {string}  [opts.chatId]        – remoteJid (needed for group metadata)
 */
export async function getPermissions(sender, ownerNumber, { fromMe = false, sock, chatId } = {}) {
  const ownerDigits = (ownerNumber || "").replace(/\D/g, "");

  // ── Method 1: fromMe shortcut ─────────────────────────────────────────────
  // msg.key.fromMe = true means the message came FROM the bot's own device.
  // That device is controlled by the owner, so this is always an owner command.
  if (fromMe) {
    return ownerPerms();
  }

  // ── Method 2: Numeric phone comparison ───────────────────────────────────
  // Handles all @s.whatsapp.net and :device-suffix JIDs
  if (ownerDigits) {
    const senderNum = jidDigits(sender);
    if (senderNum && senderNum === ownerDigits) {
      return ownerPerms();
    }

    // ── Method 3: @lid resolution (group privacy JIDs, WhatsApp 2024+) ──────
    if (sender.endsWith("@lid") && sock) {
      const resolvedNum = await resolveLidToDigits(sender, sock, chatId);
      if (resolvedNum && resolvedNum === ownerDigits) {
        return ownerPerms();
      }
    }
  }

  // ── Check mods.json (set by .addmod command) ─────────────────────────────
  const senderNum = jidDigits(sender);
  const modsData  = readData("mods", { list: [] });
  const isModByFile = Array.isArray(modsData.list) && modsData.list.includes(senderNum);

  // ── Fetch from MongoDB ───────────────────────────────────────────────────
  try {
    const db   = await getDb();
    const user = await db.collection("users").findOne(
      { _id: sender },
      { projection: { staffLevel: 1, isPremium: 1, jailed: 1, jailUntil: 1, staffImmunity: 1 } }
    );

    const staffLevel = user?.staffLevel || 0;
    const now        = Date.now();

    let isJailed = !!(user?.jailed);
    if (isJailed && user?.jailUntil && user.jailUntil <= now) {
      isJailed = false;
      await db.collection("users").updateOne(
        { _id: sender },
        { $set: { jailed: false, jailUntil: null } }
      );
    }

    const modLevel = isModByFile ? Math.max(1, staffLevel) : staffLevel;

    return {
      isOwner:       false,
      isStaff:       modLevel >= 2,
      isMod:         modLevel >= 1 || isModByFile,
      isPremium:     !!(user?.isPremium) || modLevel >= 1 || isModByFile,
      isJailed,
      staffImmunity: !!(user?.staffImmunity) || modLevel >= 2,
      staffLevel:    modLevel,
    };
  } catch {
    // DB unavailable — fall back to mods.json only
    return {
      isOwner:       false,
      isStaff:       false,
      isMod:         isModByFile,
      isPremium:     isModByFile,
      isJailed:      false,
      staffImmunity: false,
      staffLevel:    isModByFile ? 1 : 0,
    };
  }
}

function ownerPerms() {
  return {
    isOwner:       true,
    isStaff:       true,
    isMod:         true,
    isPremium:     true,
    isJailed:      false,
    staffImmunity: true,
    staffLevel:    99,
  };
}

/**
 * Standalone isMod — importable directly by any plugin.
 */
export async function isMod(jid, ownerNumber = process.env.OWNER_NUMBER || process.env.BOT_NUMBER || "") {
  const perms = await getPermissions(jid, ownerNumber);
  return perms.isMod;
}

/**
 * Standalone isOwner — importable directly by any plugin.
 */
export async function isOwnerCheck(jid, ownerNumber = process.env.OWNER_NUMBER || process.env.BOT_NUMBER || "") {
  const perms = await getPermissions(jid, ownerNumber);
  return perms.isOwner;
}
