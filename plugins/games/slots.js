import { getUser, saveUser, requireRegistration } from "../economy/database.js";
import { randomChoice } from "../../lib/gambling.mjs";
import { parseAmount } from "../economy/parseAmount.js";
import { MAX_BET, maxBetMessage } from "../economy/bettingLimits.js";

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
  return [0, 1, 2].map(() => randomChoice(SYMBOLS));
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

    const user = await getUser(sender);
    const bet  = parseAmount((args[0] || "").toLowerCase(), user.money);

    if (!bet || bet < 50) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🎰 *SLOT MACHINE*\n\nUsage: *.slots <bet>*  — e.g. .slots 50k\nMin bet: $50\nMax bet: $300B\n✦ Shorthand: k = thousand | m = million | b = billion\n\nSymbols & multipliers:\n💎 x20 | 7️⃣ x15 | ⭐ x10\n🔔 x8 | 🍇 x6 | 🍋 x5 | 🍒 x4\n2 matching — x1.5 partial win`
      }, { quoted: msg });
    }

    if (bet > MAX_BET) {
      return sock.sendMessage(msg.key.remoteJid, { text: maxBetMessage() }, { quoted: msg });
    }
    if (user.money < bet) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Insufficient funds!\n💰 Balance: $${user.money.toLocaleString()}\nBet: $${bet.toLocaleString()}`
      }, { quoted: msg });
    }

    const reels   = spin();
    const display = reels.join(" ┃ ");
    const key     = reels.join("");

    // Outcome determined purely by actual reel results — no override
    const rawMulti = PAYOUTS[key]
      ?? ((reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) ? 1.5 : 0);
    const win = Math.floor(bet * rawMulti);
    const net = win - bet;

    user.money = Math.max(0, user.money + net);
    await saveUser(sender, user);

    let result = "";
    if (rawMulti >= 10)      result = "🎉 *JACKPOT!!!*";
    else if (rawMulti > 1)   result = `✅ *YOU WIN!* (×${rawMulti})`;
    else if (rawMulti === 1.5) result = "✅ *Two of a kind! Partial payout!*";
    else                     result = "❌ *No match. Better luck next time!*";

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`🎰 *SLOT MACHINE*

╔═══════════════╗
║  ${display}  ║
╚═══════════════╝

${result}

💰 Bet    : $${bet.toLocaleString()}
${net >= 0 ? "🤑" : "💸"} ${net >= 0 ? "Won" : "Lost"}   : $${Math.abs(net).toLocaleString()}
💰 Balance: $${user.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
