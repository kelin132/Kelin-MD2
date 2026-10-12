export const PET_FEED_COOLDOWN_MS = 2 * 60 * 60 * 1000;
export const PET_PLAY_COOLDOWN_MS = 1 * 60 * 60 * 1000;
export const PET_DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function formatPetCooldown(lastUsedAt, cooldownMs, now = Date.now()) {
  const timestamp = lastUsedAt instanceof Date
    ? lastUsedAt.getTime()
    : typeof lastUsedAt === "number"
      ? lastUsedAt
      : new Date(lastUsedAt || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "READY";
  const remaining = Math.max(0, cooldownMs - (now - timestamp));
  if (remaining === 0) return "READY";
  const minutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(minutes / 60);
  return hours + "h " + String(minutes % 60).padStart(2, "0") + "m";
}
