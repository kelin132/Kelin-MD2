import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "withdraw",
  description: "Withdraw money from your bank",
  category: "economy",
  usage: ".withdraw <amount|all>",
  aliases: ["wd", "wdraw"],
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Withdraw*\n\nUsage: *.withdraw <amount>* or *.withdraw all*\n\n💵 Cash : $${user.money.toLocaleString()}\n🏦 Bank : $${user.bank.toLocaleString()}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.bank : parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (amount > user.bank) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ You only have *$${user.bank.toLocaleString()}* in your bank!`
      }, { quoted: msg });
    }

    user.bank  -= amount;
    user.money += amount;
    await saveUser(sender, user);
    await addHistory(sender, "withdraw", amount, `Withdrew $${amount.toLocaleString()} from bank`);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `💰 *Withdrawal Successful!*\n\n💸 Withdrawn : $${amount.toLocaleString()}\n💵 Cash      : $${user.money.toLocaleString()}\n🏦 Bank      : $${user.bank.toLocaleString()}`
    }, { quoted: msg });
  }
};
