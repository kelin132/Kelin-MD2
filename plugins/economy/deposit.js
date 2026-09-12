import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { bankLimitForUser, formatRyu } from "./currency.js";

export default {
  name: "deposit",
  description: "Deposit money into your bank",
  category: "economy",
  cooldown: 6,
  usage: ".deposit <amount|all>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["dep"],
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const bankLimit = bankLimitForUser(user);
    if (!user.bankCard) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "💳 You need a bank card first. Buy one in *.shop*.",
      }, { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Deposit*\n\nUsage: *.deposit <amount>* or *.deposit all*\n✦ Shorthand: 10k / 5m / 1b\n\n💰 Cash : ${formatRyu(user.money)}\n🏦 Bank : ${formatRyu(user.bank)} / ${formatRyu(bankLimit)}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.money : parseAmount(args[0].toLowerCase(), user.money);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (amount > user.money) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ You only have *${formatRyu(user.money)}* in your wallet!`
      }, { quoted: msg });
    }

    if (user.bank + amount > bankLimit) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ That deposit exceeds your bank limit of *${formatRyu(bankLimit)}*.`,
      }, { quoted: msg });
    }

    user.money -= amount;
    user.bank  += amount;
    await saveUser(sender, user);
    await addHistory(sender, "deposit", -amount, `Deposited ${formatRyu(amount)} to bank`);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏦 *Deposit Successful!*\n\n💸 Deposited : ${formatRyu(amount)}\n💰 Cash      : ${formatRyu(user.money)}\n🏦 Bank      : ${formatRyu(user.bank)} / ${formatRyu(bankLimit)}`
    }, { quoted: msg });
  }
};
