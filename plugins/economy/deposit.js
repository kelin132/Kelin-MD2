import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "deposit",
  description: "Deposit money into your bank",
  category: "economy",
  usage: ".deposit <amount|all>",
  aliases: ["dep"],
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Deposit*\n\nUsage: *.deposit <amount>* or *.deposit all*\n\n💵 Cash : $${user.money.toLocaleString()}\n🏦 Bank : $${user.bank.toLocaleString()}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.money : parseInt(args[0]);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (amount > user.money) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ You only have *$${user.money.toLocaleString()}* in your wallet!`
      }, { quoted: msg });
    }

    user.money -= amount;
    user.bank  += amount;
    await saveUser(sender, user);
    await addHistory(sender, "deposit", -amount, `Deposited $${amount.toLocaleString()} to bank`);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🏦 *Deposit Successful!*\n\n💸 Deposited : $${amount.toLocaleString()}\n💵 Cash      : $${user.money.toLocaleString()}\n🏦 Bank      : $${user.bank.toLocaleString()}`
    }, { quoted: msg });
  }
};
