import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";
import { compactMoney } from "../../lib/compactMoney.mjs";

export default {
  name: "balance",
  description: "Check your wallet and bank balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "money", "wallet"],
  cooldown: 6,

  async run({ sock, msg, sender, discord }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const jid  = msg.key.remoteJid;
    const text = formatAccountBalance({
      wallet: user.money,
      bank: user.bank,
      gems: user.diamonds,
      footerLines: ["Use .ebal", "for account breakdown"],
    });

    if (discord?.message) {
      return sock.sendMessage(jid, {
        text: [
          "💳 bal:",
          `Wallet: ${compactMoney(user.money || 0)}.`,
          `Bank: ${compactMoney(user.bank || 0)}.`,
          `Gems: ${Number(user.diamonds || 0).toLocaleString()}.`,
          `Net worth: ${compactMoney((user.money || 0) + (user.bank || 0))}.`,
        ].join(" "),
        mentions: [sender],
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
