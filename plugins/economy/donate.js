/**
 * .donate @user <amount>
 * Give money to another registered player. Aliases: gift, give
 */
import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";

export default {
  name: "donate",
  description: "Give money to another player",
  category: "economy",
  usage: ".donate @user <amount>",
  aliases: ["gift", "give"],
  checkJail: true,

  async run({ sock, msg, args, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;

    // Extract mentioned user
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || msg.message?.conversation?.match(/@([0-9]+)/)?.[1];

    let targetJid = null;

    if (mentioned && mentioned.includes("@")) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    } else {
      return sock.sendMessage(jid, {
        text: "❌ Usage: `.donate @user <amount>`\n\nMention the person you want to donate to."
      }, { quoted: msg });
    }

    // Parse amount (last arg)
    const amount = parseInt(args[args.length - 1]);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return sock.sendMessage(jid, { text: "❌ Please provide a valid donation amount." }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't donate to yourself!" }, { quoted: msg });
    }

    const giver = await getUser(sender);

    if (giver.money < amount) {
      return sock.sendMessage(jid, {
        text: `❌ You don't have enough cash!\n\n💵 Your balance: $${giver.money.toLocaleString()}`
      }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, {
        text: "❌ That player is not registered in the economy system."
      }, { quoted: msg });
    }

    const receiver = await getUser(targetJid);

    giver.money    -= amount;
    receiver.money += amount;

    await saveUser(sender, giver);
    await saveUser(targetJid, receiver);
    await addHistory(sender, "donate_out", -amount, `Donated $${amount.toLocaleString()} to ${receiver.name}`);
    await addHistory(targetJid, "donate_in", amount, `Received $${amount.toLocaleString()} from ${giver.name}`);

    // Try to notify the receiver
    try {
      await sock.sendMessage(jid, {
        text:
          `🎁 *Donation Received!*\n\n` +
          `*${giver.name}* donated *$${amount.toLocaleString()}* to you!\n` +
          `💵 Your new balance: $${receiver.money.toLocaleString()}`,
        mentions: [targetJid],
      });
    } catch { /* group or DM — message already sent to chat */ }

    await sock.sendMessage(jid, {
      text:
        `✅ *Donation Sent!*\n\n` +
        `💸 Donated    : $${amount.toLocaleString()}\n` +
        `👤 Recipient  : ${receiver.name}\n` +
        `💵 Your Balance: $${giver.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
