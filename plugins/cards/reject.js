import { getTradeById, updateTradeStatus } from "./database.js";

export default {
  name: "reject",
  aliases: ["rejecttrade", "declinetrade"],
  description: "Reject a pending card trade offer",
  category: "cards",
  usage: ".reject <tradeId>",

  async run({ sock, msg, args, sender }) {
    const chatId = msg.key.remoteJid;

    if (!args[0] || !/^[a-f0-9]{24}$/i.test(args[0])) {
      await sock.sendMessage(chatId, {
        text: "❌ Usage: *.reject <tradeId>*\n\nGet trade IDs from *.trades*",
      }, { quoted: msg });
      return;
    }

    const trade = await getTradeById(args[0]);

    if (!trade) {
      await sock.sendMessage(chatId, { text: "❌ Trade not found." }, { quoted: msg });
      return;
    }
    if (trade.toUserId !== sender && trade.fromUserId !== sender) {
      await sock.sendMessage(chatId, { text: "❌ This trade is not yours to reject." }, { quoted: msg });
      return;
    }
    if (trade.status !== "pending") {
      await sock.sendMessage(chatId, { text: `❌ This trade is already *${trade.status}*.` }, { quoted: msg });
      return;
    }

    await updateTradeStatus(args[0], "rejected");

    const fromTag = `@${trade.fromUserId.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(chatId, {
      text: `❌ *Trade rejected.*\n\n${fromTag}'s offer has been declined.`,
      mentions: [trade.fromUserId],
    }, { quoted: msg });
  },
};
