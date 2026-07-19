import { getUser, saveUser, isRegistered, requireRegistration } from "./database.js";

export default {
  name: "transfer",
  description: "Send money to another user",
  category: "economy",
  usage: ".transfer @user <amount>",
  aliases: ["send", "pay", "give"],
  cooldown: 10,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!mentionedJid || !args[1]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.transfer @user <amount>*\n\nExample: .transfer @user 500"
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

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: "❌ Enter a valid amount." }, { quoted: msg });
    }

    const sender_user = await getUser(sender);
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

    const targetTag = mentionedJid.split("@")[0];
    const senderTag = sender.split("@")[0];

    await sock.sendMessage(msg.key.remoteJid, {
      text: `✅ *Transfer Successful!*\n\n💸 Sent   : $${amount.toLocaleString()}\n👤 To     : @${targetTag}\n💰 Balance: $${sender_user.money.toLocaleString()}`,
      mentions: [sender, mentionedJid]
    }, { quoted: msg });

    // Notify target
    try {
      await sock.sendMessage(mentionedJid, {
        text: `💰 *Money Received!*\n\n@${senderTag} sent you *$${amount.toLocaleString()}*\n💵 New Balance: $${target_user.money.toLocaleString()}`,
        mentions: [sender]
      });
    } catch { /* DM may fail in groups */ }
  }
};
