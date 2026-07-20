import { getUser, requireRegistration } from "./database.js";

export default {
  name: "ebal",
  aliases: ["extbal", "fullbal", "mybal"],
  category: "economy",
  description: "Extended balance — cash, bank, vault, orbs and net worth",
  usage: ".ebal",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user  = await getUser(sender);
    const cash  = user.money  ?? 0;
    const bank  = user.bank   ?? 0;
    const vault = user.vault  ?? 0;
    const orbs  = user.orbs   ?? 0;
    const net   = cash + bank + vault;
    const loan  = user.loan?.active ? user.loan.amount : 0;

    const levelPct = Math.min(100, Math.floor(((user.xp ?? 0) % 1000) / 10));
    const bar      = "█".repeat(Math.floor(levelPct / 10)) + "░".repeat(10 - Math.floor(levelPct / 10));

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`💰 *FULL ACCOUNT BALANCE*

👤 *${user.name || "User"}*  •  Level ${user.level ?? 1}
[${bar}] ${levelPct}%

━━━━━━━━━━━━━━━
💵 Cash    : $${cash.toLocaleString()}
🏦 Bank    : $${bank.toLocaleString()}
🔒 Vault   : $${vault.toLocaleString()}
🔮 Orbs    : ${orbs.toLocaleString()} 🔮
━━━━━━━━━━━━━━━
💎 Net Worth: $${net.toLocaleString()}
${loan > 0 ? `\n⚠️ Active Loan : $${loan.toLocaleString()} (use *.loan pay*)` : ""}
🎒 Items   : ${(user.inventory ?? []).length}
⭐ XP      : ${(user.xp ?? 0).toLocaleString()}`,
      mentions: [sender],
    }, { quoted: msg });
  },
};
