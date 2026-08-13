import { getUser, saveUser, isRegistered, requireRegistration } from "./database.js";
import { parseAmount } from "./parseAmount.js";
import { formatWalletTransfer } from "./walletMessage.js";

export default {
  name: "transfer",
  description: "Send money to another user",
  category: "economy",
  usage: ".transfer @user <amount>",
  aliases: ["send", "pay"],
  cooldown: 10,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!mentionedJid || !args[1]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.transfer @user <amount>*\n\nExample: .transfer @user 500  or  .transfer @user 25k\n✦ Shorthand: k = thousand | m = million | b = billion | t = trillion"
      }, { quoted: msg });
    }

    if (mentionedJid === sender) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ You can't transfer to yourself!" }, { quoted: msg });
    }

    const targetReg = await isRegistered(mentionedJid);
    if (!targetReg) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ That user hasn't registered yet!"
      }, { quoted: msg });
    }

    const sender_user = await getUser(sender);
    const amount = parseAmount((args[1] || "").toLowerCase(), sender_user.money);
    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    if (sender_user.money < amount) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Insufficient funds!\n\nYou need: $${amount.toLocaleString()}\nYou have: $${sender_user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    const target_user = await getUser(mentionedJid);
    sender_user.money -= amount;
    target_user.money += amount;

    await saveUser(sender, sender_user);
    await saveUser(mentionedJid, target_user);

    await sock.sendMessage(msg.key.remoteJid, {
      text: formatWalletTransfer({
        action: "TRANSFER SENT",
        amount,
        senderJid: sender,
        targetJid: mentionedJid,
        receiverName: target_user.name,
        balance: sender_user.money,
      }),
      mentions: [sender, mentionedJid]
    }, { quoted: msg });
  }
};