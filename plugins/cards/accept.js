import { getTradeById, updateTradeStatus, transferCard, getUserCardById } from "./database.js";

export default {
  name: "accept",
  aliases: ["accepttrade"],
  description: "Accept a pending card trade offer",
  category: "cards",
  usage: ".accept <tradeId>",

  async run({ sock, msg, args, sender }) {
    const chatId = msg.key.remoteJid;

    if (!args[0] || !/^[a-f0-9]{24}$/i.test(args[0])) {
      await sock.sendMessage(chatId, {
        text: "❌ Usage: *.accept <tradeId>*\n\nGet trade IDs from *.trades*",
      }, { quoted: msg });
      return;
    }

    const trade = await getTradeById(args[0]);

    if (!trade) {
      await sock.sendMessage(chatId, { text: "❌ Trade not found." }, { quoted: msg });
      return;
    }
    if (trade.toUserId !== sender) {
      await sock.sendMessage(chatId, { text: "❌ This trade offer is not for you." }, { quoted: msg });
      return;
    }
    if (trade.status !== "pending") {
      await sock.sendMessage(chatId, { text: `❌ This trade is already *${trade.status}*.` }, { quoted: msg });
      return;
    }

    // Verify both cards still exist with their owners
    const offeredCard   = await getUserCardById(trade.fromUserId, trade.offeredEntryId);
    const requestedCard = await getUserCardById(trade.toUserId,   trade.requestedEntryId);

    if (!offeredCard || !requestedCard) {
      await updateTradeStatus(args[0], "cancelled");
      await sock.sendMessage(chatId, {
        text: "❌ One of the cards no longer exists (was it already traded?). Trade cancelled.",
      }, { quoted: msg });
      return;
    }

    // Swap ownership
    await Promise.all([
      transferCard(trade.offeredEntryId,   trade.toUserId),
      transferCard(trade.requestedEntryId, trade.fromUserId),
    ]);
    await updateTradeStatus(args[0], "accepted");

    const fromTag = `@${trade.fromUserId.split("@")[0].split(":")[0]}`;
    const toTag   = `@${sender.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(chatId, {
      text:
`✅ *TRADE ACCEPTED!*

${fromTag} and ${toTag} have swapped cards!

${fromTag} received: *${requestedCard.cardName}* _(${requestedCard.cardTier})_
${toTag} received: *${offeredCard.cardName}* _(${offeredCard.cardTier})_`,
      mentions: [trade.fromUserId, sender],
    }, { quoted: msg });
  },
};
