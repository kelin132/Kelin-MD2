function money(value) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function number(value) {
  return Number(value ?? 0).toLocaleString();
}

export function formatAccountBalance({
  wallet = 0,
  bank = 0,
  gems = 0,
  vault,
  orbs,
  netWorth = Number(wallet ?? 0) + Number(bank ?? 0),
  extraRows = [],
  footerLines = [],
}) {
  const rows = [
    `│ 💰 𝗪𝗮𝗹𝗹𝗲𝘁  ୨୧ ${money(wallet)}`,
    `│ 🏦 𝗕𝗮𝗻𝗸    ୨୧ ${money(bank)}`,
    `│ 💎 𝗚𝗲𝗺𝘀    ୨୧ ${number(gems)}`,
  ];

  if (vault !== undefined) rows.push(`│ 🔒 𝗩𝗮𝘂𝗹𝘁   ୨୧ ${money(vault)}`);
  if (orbs !== undefined) rows.push(`│ 🔮 𝗢𝗿𝗯𝘀    ୨୧ ${number(orbs)}`);
  rows.push("│", `│ 🌌 𝗡𝗲𝘁 𝗪𝗼𝗿𝘁𝗵 ୨୧ ${money(netWorth)}`);

  if (extraRows.length) {
    rows.push("│", ...extraRows.map((row) => `│ ${row}`));
  }

  if (footerLines.length) {
    rows.push("│", `│ ✦ ${footerLines[0]}`);
    rows.push(...footerLines.slice(1).map((line) => `│   ${line}`));
  }

  return [
    "🎴 𝐀𝐂𝐂𝐎𝐔𝐍𝐓 𝐁𝐀𝐋𝐀𝐍𝐂𝐄",
    "",
    "╭─ ⟡ ───────────── ⟡ ─╮",
    ...rows,
    "╰─ ⟡ ───────────── ⟡ ─╯",
  ].join("\n");
}
