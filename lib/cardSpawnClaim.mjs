/**
 * Synchronous in-process reservation for a public card spawn.
 * The reservation is written before claim handlers await MongoDB, so only
 * the first matching claimant can proceed to save the card.
 */
export function reserveCardSpawnClaim(spawn, claimant) {
  if (!spawn || spawn.claimReservation) return null;
  const reservation = { claimant: String(claimant || ""), startedAt: Date.now() };
  spawn.claimReservation = reservation;
  return reservation;
}

export function ownsCardSpawnClaim(spawn, reservation) {
  return Boolean(spawn && reservation && spawn.claimReservation === reservation);
}

export function releaseCardSpawnClaim(spawn, reservation) {
  if (!ownsCardSpawnClaim(spawn, reservation)) return false;
  delete spawn.claimReservation;
  return true;
}

export function isCardSpawnClaimReserved(spawn) {
  return Boolean(spawn?.claimReservation);
}
