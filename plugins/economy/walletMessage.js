function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function tagFor(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

export function formatWalletTransfer({
  amount,
  targetJid,
  receiverName,
  balance,
}) {
  const recipient = receiverName
    ? `${tagFor(targetJid)}`
    : tagFor(targetJid);

  const formattedAmount = Number(amount || 0).toLocaleString();
  const formattedBalance = Number(balance || 0).toLocaleString();

  return `You have sent ${recipient} $${formattedAmount}\nBalance ~ $${formattedBalance} 🪙`;
}
