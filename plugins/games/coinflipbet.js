import { getUser, saveUser, requireRegistration } from "../economy/database.js";
import { randomChoice } from "../../lib/gambling.mjs";
import { parseAmount } from "../economy/parseAmount.js";
import { MAX_BET, maxBetMessage } from "../economy/bettingLimits.js";

export default {
  name: "coinflipbet",
  description: "Bet on a coin flip — heads or tails",
  category: "games",
  usage: ".coinflipbet <heads|tails> <amount>",
  aliases: ["cfbet", "betcoin"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const choice = args[0]?.toLowerCase();
    const user   = await getUser(sender);
    const bet    = parseAmount((args[1] || "").toLowerCase(), user.money);

    if (!["heads","tails"].includes(choice) || !bet || bet < 50) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "💰 *Coin Flip Bet*\n\nUsage: *.coinflipbet <heads|tails> <amount>*\nMin bet: $50\nMax bet: $300B\n✦ Shorthand: 10k / 5m / 1b"
      }, { quoted: msg });
    }
    if (bet > MAX_BET) {
      return sock.sendMessage(msg.key.remoteJid, { text: maxBetMessage() }, { quoted: msg });
    }
    if (user.money < bet) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Not enough money!\n💰 Balance: $${user.money.toLocaleString()}`
      }, { quoted: msg });
    }

    const result = randomChoice(["heads", "tails"]);
    const won    = result === choice;

    user.money = won ? user.money + bet : user.money - bet;
    await saveUser(sender, user);

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`💰 *Coin Flip Bet!*

🎲 Result  : *${result.toUpperCase()}*
👤 Picked  : ${choice}
${won ? "✅ *YOU WIN!*" : "❌ *YOU LOSE!*"}

$${won ? "Won" : "Lost"}: $${bet.toLocaleString()}
💰 Balance: $${user.money.toLocaleString()}`
    }, { quoted: msg });
  }
};
