/**
 * lib/huntState.mjs
 * In-memory store for active PvE hunt battle sessions.
 * Keyed by player JID — one active hunt per player at a time.
 */

const hunts = new Map(); // playerJid → hunt object
const TURN_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes to act

function clearTimer(h) {
  if (h._timer) { clearTimeout(h._timer); h._timer = null; }
}

/** Start or replace an active hunt session. */
export function createHunt(jid, hunt) {
  const prev = hunts.get(jid);
  if (prev) clearTimer(prev);
  hunts.set(jid, hunt);
  return hunt;
}

/** Get active hunt for a player (null if none). */
export function getHunt(jid) {
  return hunts.get(jid) ?? null;
}

/** End and clean up a hunt session. */
export function deleteHunt(jid) {
  const h = hunts.get(jid);
  if (h) clearTimer(h);
  hunts.delete(jid);
}

/** Arm (or re-arm) the inactivity timer for a hunt session. */
export function armHuntTimer(hunt, onExpire) {
  clearTimer(hunt);
  hunt._timer = setTimeout(onExpire, TURN_TIMEOUT_MS);
}
