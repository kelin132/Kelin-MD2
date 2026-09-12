import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { formatRyu } from "./currency.js";

const MAX_WITHDRAWAL = 500_000_000_000;

export default {
  name: "withdraw",
  description: "Withdraw money from your bank",
  category: "economy",
  usage: ".withdraw <amount|all>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["wd", "wdraw"],
  cooldown: 6,
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    if (!user.bankCard) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "💳 You need a bank card first. Buy one in *.shop*.",
      }, { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Withdraw*\n\nUsage: *.withdraw <amount>* or *.withdraw all*\n✦ Shorthand: 10k / 5m / 1b\n

💰 Cash : ${formatRyu(user.money)}
🏦 Bank : ${formatRyu(user.bank)}
📌 Max per withdrawal : ${formatRyu(MAX_WITHDRAWAL)}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.bank : parseAmount(args[0].toLowerCase(), user.bank);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (amount > MAX_WITHDRAWAL) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ The maximum withdrawal is *${formatRyu(MAX_WITHDRAWAL)}* per transaction.`
      }, { quoted: msg });
    }

    if (amount > user.bank) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ You only have *${formatRyu(user.bank)}* in your bank!`
      }, { quoted: msg });
    }

    user.bank  -= amount;
    user.money += amount;
    await saveUser(sender, user);
    await addHistory(sender, "withdraw", amount, `Withdrew ${formatRyu(amount)} from bank`);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `💰 *Withdrawal Successful!*\n\n💸 Withdrawn : ${formatRyu(amount)}\n💰 Cash      : ${formatRyu(user.money)}\n🏦 Bank      : ${formatRyu(user.bank)}`
    }, { quoted: msg });
  }
};
