import { getPendingTrades } from "./database.js";

export default {
  name: "trades",
  aliases: ["mytrades", "pendingtrades"],
  description: "View your pending trade offers",
  category: "cards",
  usage: ".trades",

  async run({ sock, msg, sender }) {
    const chatId = msg.key.remoteJid;
    const trades = await getPendingTrades(sender);

    if (!trades.length) {
      await sock.sendMessage(chatId, {
        text: "📭 You have no pending trades.\n\nUse *.trade @user <yourCardId> <theirCardId>* to offer one.",
      }, { quoted: msg });
      return;
    }

    const lines = trades.map((t, i) => {
      const dir    = t.fromUserId === sender ? "📤 Sent to" : "📥 From";
      const target = t.fromUserId === sender ? t.toUserId : t.fromUserId;
      const tag    = `@${target.split("@")[0].split(":")[0]}`;
      return `${i + 1}. *Trade ID:* \`${t._id}\`\n   ${dir} ${tag}\n   _Use .accept or .reject with the trade ID_`;
    });

    await sock.sendMessage(chatId, {
      text: `🔄 *YOUR PENDING TRADES* (${trades.length})\n\n${lines.join("\n\n")}`,
      mentions: trades.map((t) => (t.fromUserId === sender ? t.toUserId : t.fromUserId)),
    }, { quoted: msg });
  },
};
