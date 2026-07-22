/**
 * KELIN MD — Move-learn pending state (in-memory, per trainer)
 * When a Pokémon levels up and can learn a new move, we store the pending
 * learn here and give the trainer 60 seconds to decide.
 */

const TIMEOUT_MS = 60 * 1000; // 60 seconds

// trainerJid → { pokemonId, pokemonName, newMove, currentMoves, chatId, expiresAt, timer }
const pending = new Map();

export function setPendingLearn(trainerJid, { pokemonId, pokemonName, newMove, currentMoves, chatId }) {
  // Clear any existing timer for this trainer
  const existing = pending.get(trainerJid);
  if (existing?.timer) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    pending.delete(trainerJid);
  }, TIMEOUT_MS);

  pending.set(trainerJid, {
    pokemonId,
    pokemonName,
    newMove,
    currentMoves,
    chatId,
    expiresAt: Date.now() + TIMEOUT_MS,
    timer,
  });
}

export function getPendingLearn(trainerJid) {
  const state = pending.get(trainerJid);
  if (!state) return null;
  if (Date.now() > state.expiresAt) {
    clearTimeout(state.timer);
    pending.delete(trainerJid);
    return null;
  }
  return state;
}

export function clearPendingLearn(trainerJid) {
  const state = pending.get(trainerJid);
  if (state?.timer) clearTimeout(state.timer);
  pending.delete(trainerJid);
}

export function hasPendingLearn(trainerJid) {
  return !!getPendingLearn(trainerJid);
}
