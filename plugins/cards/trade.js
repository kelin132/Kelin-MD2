import { getUserCardById, createTrade } from "./database.js";

export default {
  name: "trade",
  aliases: ["cardtrade", "swapcards"],
  description: "Offer a card trade to another user",
  category: "cards",
  usage: ".trade @user <yourCardId> <theirCardId>",

  async run({ sock, msg, args, sender }) {
    const chatId = msg.key.remoteJid;

    if (!chatId.endsWith("@g.us")) {
      await sock.sendMessage(chatId, { text: "❌ Trades only work in groups." }, { quoted: msg });
      return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned || args.length < 2) {
      await sock.sendMessage(chatId, {
        text:
`❌ *Usage:* .trade @user <yourCardId> <theirCardId>

*Example:*
.trade @John 64a1b2c3d4e5f6789abc1234 64a1b2c3d4e5f6789abc5678

Get card IDs from *.collection*`,
      }, { quoted: msg });
      return;
    }

    if (mentioned === sender) {
      await sock.sendMessage(chatId, { text: "❌ You can't trade with yourself." }, { quoted: msg });
      return;
    }

    // Find the two card IDs in args (skip @mention tokens)
    const ids = args.filter((a) => /^[a-f0-9]{24}$/i.test(a));
    if (ids.length < 2) {
      await sock.sendMessage(chatId, {
        text: "❌ Please provide two valid card IDs (24-character hex).\nGet them from *.collection*",
      }, { quoted: msg });
      return;
    }

    const [offeredId, requestedId] = ids;

    // Validate ownership
    const offeredCard   = await getUserCardById(sender,    offeredId);
    const requestedCard = await getUserCardById(mentioned, requestedId);

    if (!offeredCard) {
      await sock.sendMessage(chatId, { text: `❌ You don't own card \`${offeredId}\`` }, { quoted: msg });
      return;
    }
    if (!requestedCard) {
      await sock.sendMessage(chatId, {
        text: `❌ @${mentioned.split("@")[0]} doesn't own card \`${requestedId}\``,
        mentions: [mentioned],
      }, { quoted: msg });
      return;
    }

    const trade   = await createTrade(sender, mentioned, chatId, offeredId, requestedId);
    const fromTag = `@${sender.split("@")[0].split(":")[0]}`;
    const toTag   = `@${mentioned.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(chatId, {
      text:
`🔄 *TRADE OFFER SENT!*

*From*  : ${fromTag}
*To*    : ${toTag}
📤 *Offering*  : ${offeredCard.cardName} _(${offeredCard.cardTier})_
📥 *Requesting*: ${requestedCard.cardName} _(${requestedCard.cardTier})_
🆔 *Trade ID*  : \`${trade._id}\`

${toTag} — use *.accept ${trade._id}* or *.reject ${trade._id}*`,
      mentions: [sender, mentioned],
    }, { quoted: msg });
  },
};
