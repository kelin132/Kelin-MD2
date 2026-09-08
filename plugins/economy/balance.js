import { getUser, requireRegistration } from "./database.js";
import * as balanceFormatter from "./balanceFormat.js";

function formatCompactMoney(value) {
  let formatted;
  if (typeof balanceFormatter.formatCompactMoney === "function") {
    formatted = balanceFormatter.formatCompactMoney(value);
  } else {
    const amount = Number(value ?? 0);
    const absolute = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const compact = (number) => number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

    if (absolute >= 1e12) formatted = `${sign}$${compact(absolute / 1e12)}T`;
    else if (absolute >= 1e9) formatted = `${sign}$${compact(absolute / 1e9)}B`;
    else if (absolute >= 1e6) formatted = `${sign}$${compact(absolute / 1e6)}M`;
    else if (absolute >= 1e3) formatted = `${sign}$${compact(absolute / 1e3)}K`;
    else formatted = `${sign}$${absolute.toLocaleString()}`;
  }

  return formatted.replace(/([KMBT])$/u, (_, suffix) => suffix.toLowerCase());
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
      "💳 𝗔𝗖𝗖𝗢𝗨𝗡𝗧 𝗕𝗔𝗟𝗔𝗡𝗖𝗘",
      "━━━━━━━━━━━━━━━━━",
      `💰 𝗪𝗮𝗹𝗹𝗲𝘁  ❖ ⟦ \`${formatCompactMoney(wallet)}\` ⟧`,
      `🏦 𝗕𝗮𝗻𝗸    ❖ ⟦ \`${formatCompactMoney(bank)}\` ⟧`,
      `💍 𝗧𝗼𝘁𝗮𝗹   ❖ ⟦ \`${formatCompactMoney(wallet + bank)}\` ⟧`,
      "━━━━━━━━━━━━━━━━━",
    ].join("\n");

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
