import { getUser, requireRegistration } from "./database.js";

export default {
  name: "balance",
  description: "Check your wallet and bank balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "money", "wallet"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const net  = user.money + user.bank;

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`💰 *WALLET*

👤 @${sender.split("@")[0]}

💵 Cash   : $${user.money.toLocaleString()}
🏦 Bank   : $${user.bank.toLocaleString()}
💎 Total  : $${net.toLocaleString()}
⭐ Level  : ${user.level}
🔮 XP     : ${user.xp}`,
      mentions: [sender]
    }, { quoted: msg });
  }
};
