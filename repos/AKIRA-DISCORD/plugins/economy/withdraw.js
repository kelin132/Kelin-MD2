import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { generateTransferImage } from "../../lib/economyCanvas.mjs";

const MAX_WITHDRAWAL = 300_000_000_000;

export default {
  name: "withdraw",
  description: "Withdraw money from your bank",
  category: "economy",
  usage: ".withdraw <amount|all>  ✦ shorthand OK: 10k / 5m / 1b",
  aliases: ["wd", "wdraw"],
  cooldown: 6,
  checkJail: true,

  async run({ sock, msg, sender, args, discord }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🏦 *Withdraw*\n\nUsage: *.withdraw <amount>* or *.withdraw all*\n✦ Shorthand: 10k / 5m / 1b\n

💰 Cash : $${user.money.toLocaleString()}
🏦 Bank : $${user.bank.toLocaleString()}
📌 Max per withdrawal : $${MAX_WITHDRAWAL.toLocaleString()}`
      }, { quoted: msg });
    }

    let amount = args[0].toLowerCase() === "all" ? user.bank : parseAmount(args[0].toLowerCase(), user.bank);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (amount > MAX_WITHDRAWAL) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ The maximum withdrawal is *$${MAX_WITHDRAWAL.toLocaleString()}* per transaction.`
      }, { quoted: msg });
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

    const text = `💰 *Withdrawal Successful!*\n\n💸 Withdrawn : $${amount.toLocaleString()}\n💰 Cash      : $${user.money.toLocaleString()}\n🏦 Bank      : $${user.bank.toLocaleString()}`;
    if (discord?.message) {
      const image = await generateTransferImage({
        direction: "withdraw",
        amount,
        cash: user.money,
        bank: user.bank,
      });
      return sock.sendMessage(msg.key.remoteJid, {
        image,
        fileName: "withdrawal.png",
        discordEmbed: {
          title: "🏦 Withdrawal Successful",
          description: `You withdrew **$${amount.toLocaleString()}** from your bank.`,
          color: "#FF9F43",
          image: "attachment",
          fields: [
            { name: "🏦 Bank", value: `$${user.bank.toLocaleString()}`, inline: true },
            { name: "💰 Wallet", value: `$${user.money.toLocaleString()}`, inline: true },
          ],
        },
      }, { quoted: msg });
    }
    return sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
