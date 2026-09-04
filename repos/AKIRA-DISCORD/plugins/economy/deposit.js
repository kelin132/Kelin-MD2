import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { generateTransferImage } from "../../lib/economyCanvas.mjs";

export default {
  name: "deposit",
  description: "Deposit money into your bank",
  category: "economy",
  cooldown: 6,
  usage: ".deposit <amount|all>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["dep"],
  checkJail: true,

  async run({ sock, msg, sender, args, discord }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Deposit*\n\nUsage: *.deposit <amount>* or *.deposit all*\n✦ Shorthand: 10k / 5m / 1b\n\n💰 Cash : $${user.money.toLocaleString()}\n🏦 Bank : $${user.bank.toLocaleString()}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.money : parseAmount(args[0].toLowerCase(), user.money);

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

    const text = `🏦 *Deposit Successful!*\n\n💸 Deposited : $${amount.toLocaleString()}\n💰 Cash      : $${user.money.toLocaleString()}\n🏦 Bank      : $${user.bank.toLocaleString()}`;
    if (discord?.message) {
      const image = await generateTransferImage({
        direction: "deposit",
        amount,
        cash: user.money,
        bank: user.bank,
      });
      return sock.sendMessage(msg.key.remoteJid, {
        image,
        fileName: "deposit.png",
        discordEmbed: {
          title: "🏦 Deposit Successful",
          description: `You deposited **$${amount.toLocaleString()}** into your bank.`,
          color: "#45D483",
          image: "attachment",
          fields: [
            { name: "💰 Wallet", value: `$${user.money.toLocaleString()}`, inline: true },
            { name: "🏦 Bank", value: `$${user.bank.toLocaleString()}`, inline: true },
          ],
        },
      }, { quoted: msg });
    }
    return sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
