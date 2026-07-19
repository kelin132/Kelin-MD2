import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "pay",
  description: "Send coins to another user",
  category: "economy",
  usage: ".pay @user <amount>",
  aliases: ["give", "send"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, args, senderNum }) {
    const jid = msg.key.remoteJid;

    // Parse mentioned user and amount
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const amount    = parseInt(args[args.length - 1]);

    if (!mentioned || isNaN(amount) || amount <= 0) {
      return sock.sendMessage(jid, { text: "Usage: .pay @user <amount>\nExample: .pay @friend 100" }, { quoted: msg });
    }

    const targetNum = mentioned.replace(/[^0-9]/g, "");
    if (targetNum === senderNum) return sock.sendMessage(jid, { text: "❌ You can't pay yourself." });

    const eco    = readData("economy", {});
    const sender = eco[senderNum] ?? { coins: 0, bank: 0 };
    const target = eco[targetNum] ?? { coins: 0, bank: 0 };

    if ((sender.coins ?? 0) < amount) {
      return sock.sendMessage(jid, { text: `❌ Insufficient coins. You have *${sender.coins ?? 0}*.` }, { quoted: msg });
    }

    sender.coins = (sender.coins ?? 0) - amount;
    target.coins = (target.coins ?? 0) + amount;
    eco[senderNum] = sender;
    eco[targetNum] = target;
    writeData("economy", eco);

    await sock.sendMessage(jid, {
      text: `✅ Sent *${amount} coins* to @${targetNum}\n💰 Your balance: *${sender.coins}*`,
      mentions: [mentioned],
    }, { quoted: msg });
  },
};
