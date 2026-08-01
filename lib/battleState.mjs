/**
 * lib/battleState.mjs
 * In-memory store for active PvP battle sessions.
 * Each group can have at most one battle at a time.
 */

const battles = new Map(); // groupJid → battle object
const TURN_TIMEOUT_MS = 120_000; // 2 minutes per turn

function clearTimer(b) {
  if (b._timer) { clearTimeout(b._timer); b._timer = null; }
}

/**
 * Create a new pending battle (waiting for opponent to accept).
 * @param {string} groupJid
 * @param {object} challenger  — combatant snapshot (see nbattle.js snap())
 * @param {object} opponent    — combatant snapshot
 */
export function createBattle(groupJid, challenger, opponent) {
  const prev = battles.get(groupJid);
  if (prev) clearTimer(prev);

  const b = {
    groupJid,
    challenger,
    opponent,
    turn:   'challenger', // overwritten when battle goes active
    round:  1,
    status: 'pending',    // pending | active
    _timer: null,
  };
  battles.set(groupJid, b);
  return b;
}

/** Get battle by group JID. */
export function getBattle(groupJid) {
  return battles.get(groupJid) ?? null;
}

/** Remove and clean up a battle. */
export function deleteBattle(groupJid) {
  const b = battles.get(groupJid);
  if (b) clearTimer(b);
  battles.delete(groupJid);
}

/** Find a battle that includes a given player JID (either side). */
export function getBattleByPlayer(jid) {
  for (const b of battles.values()) {
    if (b.challenger.jid === jid || b.opponent.jid === jid) return b;
  }
  return null;
}

/**
 * Arm (or re-arm) the inactivity timer for a battle.
 * @param {object}   battle
 * @param {Function} onExpire — async callback fired when timer fires
 */
export function armTimer(battle, onExpire) {
  clearTimer(battle);
  battle._timer = setTimeout(onExpire, TURN_TIMEOUT_MS);
}
