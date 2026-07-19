import { getUser, saveUser, requireRegistration } from "../economy/database.js";

const SYMBOLS = ["🍒", "🍋", "🍇", "🔔", "⭐", "💎", "7️⃣"];
const PAYOUTS = {
  "💎💎💎": 20,
  "7️⃣7️⃣7️⃣": 15,
  "⭐⭐⭐": 10,
  "🔔🔔🔔": 8,
  "🍇🍇🍇": 6,
  "🍋🍋🍋": 5,
  "🍒🍒🍒": 4,
};

function spin() {
  return [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
}

export default {
  name: "slots",
  description: "Play the slot machine! Match 3 to win big",
  category: "games",
  usage: ".slots <bet>",
  aliases: ["slot", "spin"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const bet  = parseInt(args[0]);
    const user = await getUser(sender);

    if (!bet || bet < 50) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎰 *SLOT MACHINE*\n\nUsage: *.slots <bet>*\nMin bet: $50\n\nSymbols & multipliers:\n💎 x20 | 7️⃣ x15 | ⭐ x10\n🔔 x8 | 🍇 x6 | 🍋 x5 | 🍒 x4`
      }, { quoted: msg });
    }

    if (user.money < bet) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Insufficient funds!\n💵 Balance: $${user.money.toLocaleString()}\nBet: $${bet.toLocaleString()}`
      }, { quoted: msg });
    }

    const reels    = spin();
    const display  = reels.join(" ┃ ");
    const key      = reels.join("");
    const multi    = PAYOUTS[key] ?? (reels[0] === reels[1] || reels[1] === reels[2] ? 1.5 : 0);
    const win      = Math.floor(bet * multi);
    const net      = win - bet;

    user.money += net;
    await saveUser(sender, user);

    let result = "";
    if (multi >= 10)    result = "🎉 *JACKPOT!!!*";
    else if (multi > 1) result = `✅ *YOU WIN!* (x${multi})`;
    else if (multi === 1.5) result = "✅ *Two of a kind! Half payout!*";
    else                result = "❌ *No match. Better luck next time!*";

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`🎰 *SLOT MACHINE*

╔═══════════════╗
║  ${display}  ║
╚═══════════════╝

${result}

💰 Bet    : $${bet.toLocaleString()}
${net >= 0 ? "🤑" : "💸"} ${net >= 0 ? "Won" : "Lost"}   : $${Math.abs(net).toLocaleString()}
💵 Balance: $${user.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
