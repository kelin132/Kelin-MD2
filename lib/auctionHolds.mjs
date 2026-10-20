export const AUCTION_HOLD_RECOVERY_GRACE_MS = 5 * 60 * 1000;

export function hasActiveAuctionHolds(user, now = Date.now()) {
  const holds = user?.auctionHolds;
  if (!holds || typeof holds !== "object") return false;
  return Object.values(holds).some((hold) =>
    Number.isFinite(Number(hold?.expiresAt)) && Number(hold.expiresAt) > now,
  );
}

export function activeAuctionHoldAmount(user, now = Date.now(), excludedAuctionId = "") {
  const holds = user?.auctionHolds;
  if (!holds || typeof holds !== "object") return 0;
  return Object.values(holds).reduce((total, hold) => {
    const amount = Math.trunc(Number(hold?.amount));
    const isActive = Number.isFinite(Number(hold?.expiresAt)) && Number(hold.expiresAt) > now;
    if (!isActive || hold?.auctionId === excludedAuctionId || !Number.isSafeInteger(amount) || amount <= 0) {
      return total;
    }
    return total + amount;
  }, 0);
}
