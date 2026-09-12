export const CURRENCY_NAME = "ryu";
export const STARTING_MONEY = 30_000;
export const BASE_BANK_LIMIT = 50_000;
export const BANK_CARD_PRICE = 5_000;
export const BANK_LIMIT_UPGRADE_PRICE = 25_000;

const BETTING_TIERS = [
  { minimum: 1, maximum: 50_000, winRate: 0.5, multiplier: 1.7 },
  { minimum: 60_000, maximum: 200_000, winRate: 0.45, multiplier: 1.9 },
  { minimum: 210_000, maximum: 500_000, winRate: 0.4, multiplier: 2.2 },
  { minimum: 510_000, maximum: 1_000_000, winRate: 0.3, multiplier: 3 },
  { minimum: 2_000_000, maximum: 10_000_000, winRate: 0.18, multiplier: 5 },
  { minimum: 11_000_000, maximum: Number.POSITIVE_INFINITY, winRate: 0.09, multiplier: 10 },
];

function compact(value) {
  const amount = Math.abs(Number(value) || 0);
  if (amount >= 1e12) return `${trim(amount / 1e12)}t`;
  if (amount >= 1e9) return `${trim(amount / 1e9)}b`;
  if (amount >= 1e6) return `${trim(amount / 1e6)}m`;
  if (amount >= 1e3) return `${trim(amount / 1e3)}k`;
  return amount.toLocaleString("en-US");
}

function trim(value) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatRyu(value) {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  return `${sign}${compact(amount)} ${CURRENCY_NAME}`;
}

export function bankLimitForUser(user = {}) {
  const level = Math.max(1, Number(user.level) || 1);
  const upgrades = Math.max(0, Number(user.bankUpgradeLevel) || 0);
  return Math.floor(BASE_BANK_LIMIT * (1 + (level - 1) * 0.02 + upgrades * 0.05));
}

export function getBettingTier(amount) {
  const wager = Math.max(1, Math.floor(Number(amount) || 1));
  return [...BETTING_TIERS].reverse().find((tier) => wager >= tier.minimum) || BETTING_TIERS[0];
}

export function bettingTierLabel(tier) {
  const upper = Number.isFinite(tier.maximum) ? formatRyu(tier.maximum) : "11m+ ryu";
  return `${formatRyu(tier.minimum)} – ${upper}: ${tier.winRate * 100}% win / ×${tier.multiplier}`;
}

export { BETTING_TIERS };