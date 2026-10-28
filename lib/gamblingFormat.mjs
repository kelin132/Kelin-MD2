export function formatMoney(value) {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);
  if (n >= 1e12) return `${sign}$${trimUnit(n / 1e12)}T`;
  if (n >= 1e9) return `${sign}$${trimUnit(n / 1e9)}B`;
  if (n >= 1e6) return `${sign}$${trimUnit(n / 1e6)}M`;
  if (n >= 1e3) return `${sign}$${trimUnit(n / 1e3)}K`;
  return `${sign}$${n.toLocaleString()}`;
}

function trimUnit(value) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatGamblingResult({
  icon = "🎰",
  title = "GAME",
  won = false,
  push = false,
  betLabel = "Bet",
  bet,
  got = "",
  details = [],
  net = 0,
  balance = 0,
}) {
  const status = push ? "PUSH" : won ? "WIN" : "LOSE";
  const statusIcon = push ? "🟡" : won ? "✅" : "❌";
  const lines = [`┌ ${icon} ${title.toUpperCase()} ─ ${status} ${statusIcon}`];
  lines.push(`│ 🎯 ${betLabel} ${formatMoney(bet)}`);
  if (got) lines.push(`│ 🎲 Got: ${got}`);
  for (const detail of details) {
    if (detail) lines.push(`│ ${detail}`);
  }
  const changeIcon = net > 0 ? "💰 +" : net < 0 ? "💸 -" : "💰 ±";
  lines.push(`│ ${changeIcon} ${formatMoney(Math.abs(net))} │ 💰 ${formatMoney(balance)}`);
  lines.push("└─────────────────");
  return lines.join("\n");
}
