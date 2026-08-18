const RANKS = ["🥇", "🥈", "🥉", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
const BOLD = Object.fromEntries([..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"].map((char) => {
  const upper = char.toUpperCase();
  const lower = char.toLowerCase();
  const code = char >= "A" && char <= "Z" ? 0x1d400 + upper.charCodeAt(0) - 65 : char >= "a" && char <= "z" ? 0x1d41a + lower.charCodeAt(0) - 97 : 0x1d7ce + Number(char);
  return [char, String.fromCodePoint(code)];
}));

export function boldText(value) {
  return [...String(value ?? "Unknown")].map((char) => BOLD[char] || char).join("");
}

export function formatAnimeLeaderboard({
  title = "CARD COLLECTORS",
  subtitle = "ANIME CARD LEADERBOARD",
  rows = [],
  valueIcon = "🃏",
  valueLabel = "CARDS",
  footer = "ANIME LEGENDS",
}) {
  const lines = [
    `╭━━━━━━〔 🎴 𝐂𝐀𝐑𝐃 𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐎𝐑𝐒 〕━━━━━━╮`,
    "│",
    `│       ✦ ${boldText(subtitle)} ✦`,
    "│             ───── ୨୧ ─────",
    "│",
  ];

  rows.slice(0, 10).forEach((row, index) => {
    lines.push(`│ ${RANKS[index] || `${index + 1}.`} ${boldText(row.name)}`);
    const value = row.valueText || `${valueIcon} ${row.value.toLocaleString()} ${valueLabel}`;
    lines.push(`│    ╰─ ${value}`);
    if (index < Math.min(rows.length, 10) - 1) lines.push("│");
  });

  const footerText = String(footer).startsWith("🌸") ? String(footer) : `🌸 ${footer}`;
  lines.push("│", "│       🌸 ✦ 𝐂𝐎𝐋𝐋𝐄𝐂𝐓 • 𝐂𝐎𝐌𝐏𝐄𝐓𝐄 ✦ 🌸", "│", `╰━━━━━━〔 ${footerText} 〕━━━━━━╯`);
  return lines.join("\n");
}
