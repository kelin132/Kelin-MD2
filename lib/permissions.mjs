/**
 * KELIN MD — Permission helper
 * Single source of truth for owner / staff / mod / premium / jail checks.
 * Called once per routeMessage() invocation so DB is hit at most once per command.
 */
import { getDb } from "./mongo.mjs";

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

    return {
      isOwner:       false,
      isStaff:       staffLevel >= 2,   // staff or admin
      isMod:         staffLevel >= 1,   // mod, staff or admin
      isPremium:     !!(user?.isPremium) || staffLevel >= 1,
      isJailed,
      staffImmunity: !!(user?.staffImmunity) || staffLevel >= 2,
      staffLevel,
    };
  } catch {
    // DB unavailable — fall back to no perms
    return {
      isOwner: false, isStaff: false, isMod: false,
      isPremium: false, isJailed: false, staffImmunity: false, staffLevel: 0,
    };
  }
}
