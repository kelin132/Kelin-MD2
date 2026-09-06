import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";

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
        discordEmbed: {
          title: "💳 AIDORU Account Balance",
          description: "Your current AIDORU economy balances.",
          color: "#57B894",
          fields: [
            { name: "Wallet", value: `$${Number(user.money || 0).toLocaleString()}`, inline: true },
            { name: "Bank", value: `$${Number(user.bank || 0).toLocaleString()}`, inline: true },
            { name: "Gems", value: Number(user.diamonds || 0).toLocaleString(), inline: true },
            { name: "Net worth", value: `$${(Number(user.money || 0) + Number(user.bank || 0)).toLocaleString()}`, inline: false },
          ],
          footer: { text: "AIDORU • Economy • Use .ebal for account breakdown" },
        },
        mentions: [sender],
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
