function money(value) {
  const amount = Number(value ?? 0);
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absolute >= 1e12) return `${sign}$${compact(absolute / 1e12)}T`;
  if (absolute >= 1e9) return `${sign}$${compact(absolute / 1e9)}B`;
  if (absolute >= 1e6) return `${sign}$${compact(absolute / 1e6)}M`;
  if (absolute >= 1e3) return `${sign}$${compact(absolute / 1e3)}K`;
  return `${sign}$${absolute.toLocaleString()}`;
}

function compact(value) {
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function number(value) {
  return Number(value ?? 0).toLocaleString();
}

function row(icon, label, value) {
  return `│ ${icon} ${label.padEnd(7)} › ${value}`;
}

export function formatAccountBalance({
  wallet = 0,
  bank = 0,
  gems = 0,
  vault,
  orbs,
  netWorth = Number(wallet ?? 0) + Number(bank ?? 0),
  extraRows = [],
}) {
  const rows = [
    row("💰", "Wallet ", money(wallet)),
    row("🏦", "Bank   ", money(bank)),
    row("💎", "Gems   ", number(gems)),
  ];

  if (vault !== undefined && vault !== null) rows.push(row("🔒", "Vault  ", money(vault)));
  if (orbs !== undefined && orbs !== null) rows.push(row("🔮", "Orbs   ", number(orbs)));
  
  rows.push("│");
  rows.push(row("🌌", "Worth  ", money(netWorth)));

  if (extraRows.length) {
    rows.push("│", ...extraRows.map((value) => `│ ${value}`));
  }

  return [
    "🎴 𝐀𝐂𝐂𝐎𝐔𝐍𝐓",
    "",
    "╭─「 🌸 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 」─╮",
    ...rows,
    "╰────────────────╯",
  ].join("\n");
}
