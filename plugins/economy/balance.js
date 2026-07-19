import { readData } from "../../lib/store.mjs";

export default {
  name: "balance",
  description: "Check your coin balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "wallet"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, senderNum }) {
    const jid  = msg.key.remoteJid;
    const eco  = readData("economy", {});
    const data = eco[senderNum] ?? { coins: 0, bank: 0 };
    await sock.sendMessage(jid, {
      text: [
        `💰 *Your Wallet*`,
        ``,
        `👛 Coins: *${data.coins ?? 0}*`,
        `🏦 Bank:  *${data.bank ?? 0}*`,
        `💎 Total: *${(data.coins ?? 0) + (data.bank ?? 0)}*`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
