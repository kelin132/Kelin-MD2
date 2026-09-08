import { getUser, requireRegistration, WALLET_CAP } from "./database.js";
import { formatCompactMoney, formatFullMoney } from "./balanceFormat.js";

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
      `🪙 𝗣𝘂𝗿𝘀𝗲   ❖ ⟦ \`${formatFullMoney(wallet)}\` ⟧`,
      `🏛️ 𝗖𝗮𝘀𝘁𝗹𝗲  ❖ ⟦ \`${formatFullMoney(bank)}\` ⟧`,
      `👑 𝗖𝗮𝗽     ❖ ⟦ \`${formatCompactMoney(WALLET_CAP)}\` ⟧`,
      "",
      `💍 𝗧𝗼𝘁𝗮𝗹   ❖ ⟦ \`${formatFullMoney(wallet + bank)}\` ⟧`,
      "━━━━━━━━━━━━━━━━━",
    ].join("\n");

    await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
  },
};
