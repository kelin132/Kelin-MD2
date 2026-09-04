export const GUN_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export function grantGun(user, now = Date.now()) {
  user.gunExpiry = now + GUN_DURATION_MS;
  return user.gunExpiry;
}

export function getGunRemaining(user, now = Date.now()) {
  const expiry = Number(user?.gunExpiry || 0);
  return Math.max(0, expiry - now);
}

export function hasActiveGun(user, now = Date.now()) {
  return getGunRemaining(user, now) > 0;
}

export function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""]
    .filter(Boolean).join(" ") || "1m";
}
