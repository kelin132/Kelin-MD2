import { getUser, requireRegistration } from "./database.js";
import * as balanceFormatter from "./balanceFormat.js";

function formatFullMoney(value) {
  if (typeof balanceFormatter.formatFullMoney === "function") {
    return balanceFormatter.formatFullMoney(value);
  }

  const amount = Number(value ?? 0);
  return `$${amount.toLocaleString()}`;
}

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
    const wallet = Number(user.money ?? 0);
    const bank = Number(user.bank ?? 0);
    const text = [
      "⚜️ 𝗥𝗢𝗬𝗔𝗟 𝗧𝗥𝗘𝗔𝗦𝗨𝗥𝗬",
      "━━━━━━━━━━━━━━━━━",
      `💰 𝗪𝗮𝗹𝗹𝗲𝘁  ❖ ⟦ \`${formatFullMoney(wallet)}\` ⟧`,
      `🏦 𝗕𝗮𝗻𝗸    ❖ ⟦ \`${formatFullMoney(bank)}\` ⟧`,
      `💍 𝗧𝗼𝘁𝗮𝗹   ❖ ⟦ \`${formatFullMoney(wallet + bank)}\` ⟧`,
      "━━━━━━━━━━━━━━━━━",
    ].join("\n");

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
