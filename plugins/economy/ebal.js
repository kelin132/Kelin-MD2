import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";

export default {
  name: "ebal",
  aliases: ["extbal", "fullbal", "mybal"],
  category: "economy",
  cooldown: 6,
  description: "Extended balance — cash, bank, vault, orbs and net worth",
  usage: ".ebal",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user  = await getUser(sender);
    const cash  = user.money  ?? 0;
    const bank  = user.bank   ?? 0;
    const vault = user.vault  ?? 0;
    const orbs  = user.orbs   ?? 0;
  const diamonds = user.diamonds ?? 0;
    const net   = cash + bank + vault;
    const loan  = user.loan?.active ? user.loan.amount : 0;

    const extraRows = [
      `⭐ 𝗟𝗲𝘃𝗲𝗹   ୨୧ ${user.level ?? 1}`,
      `🔮 𝗫𝗣      ୨୧ ${(user.xp ?? 0).toLocaleString()}`,
      `🎒 𝗜𝘁𝗲𝗺𝘀   ୨୧ ${(user.inventory ?? []).length}`,
    ];

    if (loan > 0) extraRows.push(`⚠️ 𝗟𝗼𝗮𝗻    ୨୧ $${loan.toLocaleString()}`);

    await sock.sendMessage(msg.key.remoteJid, {
      text: formatAccountBalance({
        wallet: cash,
        bank,
        gems: diamonds,
        vault,
        orbs,
        netWorth: net,
        extraRows,
      }),
      mentions: [sender],
    }, { quoted: msg });
  },
};
