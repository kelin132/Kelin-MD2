/**
 * KELIN MD — DBZ battle state (in-memory, per chat)
 * Parallel to lib/pokemon/battleState.mjs
 * Supports PvP challenges and villain fights.
 */

const TIMEOUT_MS = 10 * 60 * 1000; // 10 min inactivity

// chatId → battleState
const battles = new Map();

// pending PvP challenges: challengerJid → { opponentJid, chatId, startedAt, fighter }
const pendingChallenges = new Map();

export function getBattle(chatId) {
  const b = battles.get(chatId);
  if (!b) return null;
  if (Date.now() - b.lastAction > TIMEOUT_MS) {
    battles.delete(chatId);
    return null;
  }
  return b;
}

/**
 * Start a PvP DBZ battle.
 * challenger / opponent: { jid, username, fighter }
 * fighter: { _id?, characterId, name, level, hp, maxHp, attack, defense, speed, ki, maxKi, imageUrl, forms, currentFormIndex, race }
 */
export function startPvPBattle(chatId, challenger, opponent) {
  const state = {
    type: "pvp",
    chatId,
    challengerJid:    challenger.jid,
    challengerName:   challenger.username,
    challengerFighter: { ...challenger.fighter, ki: challenger.fighter.maxKi },
    opponentJid:      opponent.jid,
    opponentName:     opponent.username,
    opponentFighter:  { ...opponent.fighter, ki: opponent.fighter.maxKi },
    turn:   "challenger",
    round:  1,
    status: "active",
    lastAction: Date.now(),
  };
  battles.set(chatId, state);
  return state;
}

/**
 * Start a villain fight.
 * fighter: { jid, username, fighter }
 * villain: the villain object from villainState
 */
export function startVillainBattle(chatId, fighter, villain) {
  const state = {
    type: "villain",
    chatId,
    challengerJid:    fighter.jid,
    challengerName:   fighter.username,
    challengerFighter: { ...fighter.fighter, ki: fighter.fighter.maxKi },
    opponentJid:      null,
    opponentName:     villain.name,
    opponentFighter:  {
      ...villain,
      ki:    villain.maxKi || 200,
      maxKi: villain.maxKi || 200,
      forms:             villain.forms || [],
      currentFormIndex:  0,
    },
    turn:   "challenger",
    round:  1,
    status: "active",
    lastAction: Date.now(),
  };
  battles.set(chatId, state);
  return state;
}

export function updateBattle(chatId, updates) {
  const b = battles.get(chatId);
  if (!b) return null;
  const updated = { ...b, ...updates, lastAction: Date.now() };
  battles.set(chatId, updated);
  return updated;
}

export function endBattle(chatId) {
  battles.delete(chatId);
}

export function hasBattle(chatId) {
  return !!getBattle(chatId);
}

export function isInBattle(chatId, jid) {
  const b = getBattle(chatId);
  if (!b) return false;
  return b.challengerJid === jid || b.opponentJid === jid;
}

export function isMyTurn(chatId, jid) {
  const b = getBattle(chatId);
  if (!b) return false;
  if (b.turn === "challenger" && b.challengerJid === jid) return true;
  if (b.turn === "opponent"   && b.opponentJid   === jid) return true;
  return false;
}

// ── PvP challenge queue ────────────────────────────────────────────────────────

export function setPendingChallenge(challengerJid, opponentJid, chatId, fighter) {
  pendingChallenges.set(challengerJid, {
    opponentJid,
    chatId,
    startedAt: Date.now(),
    fighter,
  });
}

export function getPendingChallenge(challengerJid) {
  const c = pendingChallenges.get(challengerJid);
  if (!c) return null;
  if (Date.now() - c.startedAt > 2 * 60 * 1000) {
    pendingChallenges.delete(challengerJid);
    return null;
  }
  return c;
}

export function getIncomingChallenge(opponentJid) {
  for (const [challenger, c] of pendingChallenges) {
    if (c.opponentJid === opponentJid && Date.now() - c.startedAt < 2 * 60 * 1000) {
      return { challengerJid: challenger, ...c };
    }
  }
  return null;
}

export function clearPendingChallenge(challengerJid) {
  pendingChallenges.delete(challengerJid);
}
