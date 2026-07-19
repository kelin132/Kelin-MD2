/**
 * KELIN MD — Permission helper
 * Single source of truth for owner / staff / mod / premium / jail checks.
 * Called once per routeMessage() invocation so DB is hit at most once per command.
 *
 * Also exports a standalone isMod(jid) helper for plugins that need a direct check.
 */
import { getDb } from "./mongo.mjs";
import { readData } from "./store.mjs";

/**
 * Build the full permission context for a sender JID.
 * @param {string} sender  – full JID e.g. "2637XXXXXXXX@s.whatsapp.net"
 * @param {string} ownerNumber – raw env value e.g. "2637XXXXXXXX" or "+2637XXXXXXXX"
 */
export async function getPermissions(sender, ownerNumber) {
  // Normalise owner to plain digits then rebuild JID
  const ownerDigits = (ownerNumber || "").replace(/\D/g, "");
  const ownerJid    = ownerDigits ? `${ownerDigits}@s.whatsapp.net` : null;

  // Compare full JIDs (groups send participant JIDs like 263xxx@s.whatsapp.net)
  const isOwner = !!ownerJid && sender === ownerJid;

  if (isOwner) {
    return {
      isOwner:       true,
      isStaff:       true,
      isMod:         true,
      isPremium:     true,
      isJailed:      false,
      staffImmunity: true,
      staffLevel:    99,   // sentinel — above all staff levels
    };
  }

  // Check mods.json (set by .addmod command)
  const senderNum = sender.replace(/[^0-9]/g, "");
  const modsData  = readData("mods", { list: [] });
  const isModByFile = Array.isArray(modsData.list) && modsData.list.includes(senderNum);

  // Fetch from DB
  try {
    const db   = await getDb();
    const user = await db.collection("users").findOne(
      { _id: sender },
      { projection: { staffLevel: 1, isPremium: 1, jailed: 1, jailUntil: 1, staffImmunity: 1 } }
    );

    const staffLevel = user?.staffLevel || 0;
    const now        = Date.now();

    let isJailed = !!(user?.jailed);

    // Auto-unjail if time has expired
    if (isJailed && user?.jailUntil && user.jailUntil <= now) {
      isJailed = false;
      await db.collection("users").updateOne(
        { _id: sender },
        { $set: { jailed: false, jailUntil: null } }
      );
    }

    const modLevel   = isModByFile ? Math.max(1, staffLevel) : staffLevel;

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

/**
 * Standalone isMod check — can be imported directly by any plugin.
 * Returns true if jid is owner, has staffLevel >= 1 in DB, or is listed in mods.json.
 *
 * @param {string} jid         – full WhatsApp JID
 * @param {string} [ownerNumber] – defaults to process.env.BOT_NUMBER
 */
export async function isMod(jid, ownerNumber = process.env.BOT_NUMBER || "") {
  const perms = await getPermissions(jid, ownerNumber);
  return perms.isMod;
}

/**
 * Standalone isOwner check.
 */
export async function isOwnerCheck(jid, ownerNumber = process.env.BOT_NUMBER || "") {
  const perms = await getPermissions(jid, ownerNumber);
  return perms.isOwner;
}
