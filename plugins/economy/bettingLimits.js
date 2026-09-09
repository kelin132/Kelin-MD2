export const MAX_BET = 300_000_000_000;
export const MAX_BET_LABEL = "$300B";

export function maxBetMessage() {
  return `❌ Maximum bet is *${MAX_BET_LABEL}*.`;
}

export function maxBetHelpLine(prefix = "│ 💰 *Max Bet* :: *") {
  return `${prefix}${MAX_BET_LABEL}*`;
}

export function isOverMaxBet(amount) {
  return Number.isFinite(amount) && amount > MAX_BET;
}

export default MAX_BET;
