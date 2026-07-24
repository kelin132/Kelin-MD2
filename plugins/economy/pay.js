import { readData, writeData } from "../../lib/store.mjs";

export default {
  name: "pay",
  description: "Send coins to another user",
  category: "economy",
  usage: ".pay @user <amount>  OR  reply to someone's message then .pay <amount>",
  aliases: ["give", "send"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.1.0",
  async run({ sock, msg, args, senderNum }) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    // ── Resolve target ─────────────────────────────────────────────────────────
    // Priority 1: @mention in the command message
    // Priority 2: sender of the message you replied to
    const mentionedJid = ctx?.mentionedJid?.[0];
    const quotedSender =
      ctx?.participant ||                          // group quoted sender
      (msg.quoted?.key?.participant ?? null) ||    // Baileys quoted key
      (msg.quoted?.key?.remoteJid !== jid          // DM quoted sender
        ? msg.quoted?.key?.remoteJid
        : null);

    const targetJid = mentionedJid || quotedSender || null;

    // ── Resolve amount ─────────────────────────────────────────────────────────
    // Last numeric argument is always the amount.
    const amount = parseInt(args[args.length - 1]);

    if (!targetJid || isNaN(amount) || amount <= 0) {
      return sock.sendMessage(
        jid,
        {
          text:
            "Usage:\n" +
            "• *.pay @user <amount>* — mention the person\n" +
            "• Reply to their message then *.pay <amount>*",
        },
        { quoted: msg }
      );
    }

    const targetNum = targetJid.replace(/[^0-9]/g, "");
    if (targetNum === senderNum) {
      return sock.sendMessage(jid, { text: "❌ You can't pay yourself." }, { quoted: msg });
    }

    const eco    = readData("economy", {});
    const sender = eco[senderNum] ?? { coins: 0, bank: 0 };
    const target = eco[targetNum] ?? { coins: 0, bank: 0 };

    if ((sender.coins ?? 0) < amount) {
      return sock.sendMessage(
        jid,
        { text: `❌ Insufficient coins. You have *${sender.coins ?? 0}*.` },
        { quoted: msg }
      );
    }

    sender.coins = (sender.coins ?? 0) - amount;
    target.coins = (target.coins ?? 0) + amount;
    eco[senderNum] = sender;
    eco[targetNum] = target;
    writeData("economy", eco);

    await sock.sendMessage(
      jid,
      {
        text: `✅ Sent *${amount} coins* to @${targetNum}\n💰 Your balance: *${sender.coins}*`,
        mentions: [targetJid],
      },
      { quoted: msg }
    );
  },
};
