/**
 * .convert <cash|bank> <amount>
 * Convert between cash and bank instantly (2% fee).
 * Different from deposit/withdraw: one command, any direction.
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "convert",
  description: "Convert between cash and bank (2% fee)",
  category: "economy",
  usage: ".convert <cash|bank> <amount>",
  aliases: ["exchange"],
  checkJail: true,

  async run({ sock, msg, args, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text:
          `🔄 *Convert*\n\n` +
          `Usage:\n` +
          `• \`.convert cash 1000\`  → move $1000 from bank → cash\n` +
          `• \`.convert bank 1000\`  → move $1000 from cash → bank\n\n` +
          `_2% conversion fee applies_`
      }, { quoted: msg });
    }

    const direction = args[0].toLowerCase();
    const amount    = parseInt(args[1]);

    if (!["cash", "bank"].includes(direction)) {
      return sock.sendMessage(jid, { text: "❌ Direction must be `cash` or `bank`." }, { quoted: msg });
    }
    if (!amount || amount <= 0 || isNaN(amount)) {
      return sock.sendMessage(jid, { text: "❌ Please provide a valid amount." }, { quoted: msg });
    }

    const user = await getUser(sender);
    const fee  = Math.max(1, Math.floor(amount * 0.02));
    const net  = amount - fee;

    if (direction === "bank") {
      // cash → bank
      if (user.money < amount) {
        return sock.sendMessage(jid, {
          text: `❌ Not enough cash!\n💵 Cash: $${user.money.toLocaleString()}`
        }, { quoted: msg });
      }
      user.money -= amount;
      user.bank  += net;
      await saveUser(sender, user);
      await addHistory(sender, "convert", -fee, `Converted $${amount.toLocaleString()} cash → bank (fee $${fee})`);

      return sock.sendMessage(jid, {
        text:
          `🔄 *Cash → Bank*\n\n` +
          `💰 Converted : $${amount.toLocaleString()}\n` +
          `💸 Fee (2%)  : -$${fee.toLocaleString()}\n` +
          `🏦 Bank +    : $${net.toLocaleString()}\n\n` +
          `💵 Cash   : $${user.money.toLocaleString()}\n` +
          `🏦 Bank   : $${user.bank.toLocaleString()}`
      }, { quoted: msg });
    }

    // bank → cash
    if (user.bank < amount) {
      return sock.sendMessage(jid, {
        text: `❌ Not enough in bank!\n🏦 Bank: $${user.bank.toLocaleString()}`
      }, { quoted: msg });
    }
    user.bank  -= amount;
    user.money += net;
    await saveUser(sender, user);
    await addHistory(sender, "convert", -fee, `Converted $${amount.toLocaleString()} bank → cash (fee $${fee})`);

    return sock.sendMessage(jid, {
      text:
        `🔄 *Bank → Cash*\n\n` +
        `💰 Converted : $${amount.toLocaleString()}\n` +
        `💸 Fee (2%)  : -$${fee.toLocaleString()}\n` +
        `💵 Cash +    : $${net.toLocaleString()}\n\n` +
        `💵 Cash : $${user.money.toLocaleString()}\n` +
        `🏦 Bank : $${user.bank.toLocaleString()}`
    }, { quoted: msg });
  }
};
