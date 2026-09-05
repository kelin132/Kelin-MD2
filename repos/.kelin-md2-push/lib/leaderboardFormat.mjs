const WEALTH_RANKS = ["𝟏", "𝟐", "𝟑", "𝟒", "𝟓", "𝟔", "𝟕", "𝟖", "𝟗", "𝟏𝟎"];
const WEALTH_SEPARATOR = "  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈";

/**
 * Shared frame used by .lb category views and .clb.
 * Keeping this in one module prevents the two leaderboard commands from
 * drifting into different layouts.
 */
export function formatLeaderboard({
  subtitle,
  rows = [],
  valueIcon = "⭐",
  valueLabel = "VALUE",
  footer = "Keep climbing",
}) {
  const lines = [
    "⛩️  *𝗪𝗘𝗔𝗟𝗧𝗛  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦* ⛩️",
    "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
    `  🌸 *${subtitle}*`,
    "  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦",
    "",
  ];

  rows.slice(0, 10).forEach((row, index, visibleRows) => {
    const name = String(row.name || "User").trim() || "User";
    const value = Number(row.value) || 0;
    lines.push(`『 ${WEALTH_RANKS[index] || String(index + 1)} 』 *${name}*`);
    lines.push(`  ┗ ${valueIcon} *${value.toLocaleString()} ${valueLabel}*`);
    if (index < visibleRows.length - 1) lines.push(WEALTH_SEPARATOR);
  });

  lines.push("", "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦", `🌺 _${footer}_`);
  return lines.join("\n");
}