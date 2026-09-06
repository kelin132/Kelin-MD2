import { compactMoney } from "../../lib/compactMoney.mjs";

function money(value) {
  return compactMoney(value);
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
