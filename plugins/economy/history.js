import { getUser, requireRegistration } from "./database.js";
import { formatRyu } from "./currency.js";

const typeEmoji = {
  daily:          "🌅",
  weekly:         "🗓️",
  monthly:        "📅",
  work:           "💼",
  crime:          "🔪",
  rob:            "🦹",
  rob_victim:     "😭",
  deposit:        "🏦",
  withdraw:       "💸",
  donate_out:     "🎁",
  donate_in:      "🎀",
  transfer_out:   "📤",
  transfer_in:    "📥",
  convert:        "🔄",
  shop:           "🛒",
  slots:          "🎰",
  coinflip:       "💰",
  dice:           "🎲",
};

export default {
  name: "history",
  description: "View your last 10 transactions",
  category: "economy",
  cooldown: 6,
  usage: ".history",
  aliases: ["txn", "transactions"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const hist = user.history || [];

    if (hist.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "📋 *Transaction History*\n\nNo transactions yet. Start earning with `.daily`, `.work`, `.crime` etc!"
      }, { quoted: msg });
    }

    const rows = [...hist].reverse().map((h, i) => {
      const emoji  = typeEmoji[h.type] || "📌";
      const sign   = h.amount >= 0 ? "+" : "";
      const amount = `${sign}${formatRyu(Math.abs(h.amount))}`;
      const date   = new Date(h.ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      return `${i + 1}. ${emoji} ${h.desc}\n    └ ${amount}  •  ${date}`;
    });

    const text =
      `📋 *Transaction History — ${user.name}*\n` +
      `${"─".repeat(32)}\n` +
      rows.join("\n\n") +
      `\n${"─".repeat(32)}\n` +
      `💰 Cash: ${formatRyu(user.money)}  |  🏦 Bank: ${formatRyu(user.bank)}`;

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
