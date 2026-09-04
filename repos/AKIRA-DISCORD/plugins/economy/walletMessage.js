function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function tagFor(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

export function formatWalletTransfer({
  action,
  amount,
  senderJid,
  targetJid,
  receiverName,
  balance,
}) {
  const recipient = receiverName
    ? `${tagFor(targetJid)} • ${clean(receiverName)}`
    : tagFor(targetJid);

  return [
    "╭━━━〔 🔖 WALLET 〕━━━╮",
    "┃",
    `┃  ✅ ${action}`,
    "┃  ─────────────────────",
    `┃  FROM    ${tagFor(senderJid)}`,
    `┃  TO      ${recipient}`,
    `┃  AMOUNT  $${Number(amount || 0).toLocaleString()}`,
    "┃",
    "┃  ─────────────────────",
    `┃  BALANCE $${Number(balance || 0).toLocaleString()}`,
    "┃",
    "╰━━━━━━━━━━━━━━━━━━━━━━━━╯",
  ].join("\n");
}