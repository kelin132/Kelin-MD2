import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";

export default {
  name: "balance",
  description: "Check your wallet and bank balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "money", "wallet"],
  cooldown: 6,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const jid  = msg.key.remoteJid;
    const text = formatAccountBalance({
      wallet: user.money,
      bank: user.bank,
      gems: user.diamonds,
      footerLines: ["Use .ebal", "for account breakdown"],
    });

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
