/**
 * Per-chat reservation shared by the plugin and legacy card-spawner entrypoints.
 * It closes the race between checking activeSpawns and awaiting series/media APIs.
 */
export function reserveCardSpawn(chatId) {
  const activeSpawns = global.activeSpawns || (global.activeSpawns = {});
  const reservations = global.__cardApiSpawnReservations
    || (global.__cardApiSpawnReservations = new Set());

  if (!chatId || activeSpawns[chatId] || reservations.has(chatId)) return false;
  reservations.add(chatId);
  return true;
}

export function releaseCardSpawn(chatId) {
  global.__cardApiSpawnReservations?.delete(chatId);
}
