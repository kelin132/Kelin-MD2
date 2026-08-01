/**
 * KELIN MD — .roulette
 * Bet on red, black, even, odd, or a specific number (0-36).
 * Usage: .roulette <red|black|even|odd|0-36> <amount>
 */
import { getUser, saveUser, requireRegistration, addHistory, maybeAwardDiamonds } from "./database.js";
import { randomInt } from "../../lib/gambling.mjs";
import { parseAmount } from "./parseAmount.js";

const COOLDOWN = 20 * 1000; // 20 seconds

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function spinWheel() {
  return randomInt(0, 36); // 0-36
}

function getColor(n) {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

const COLOR_EMOJI = { red: "🔴", black: "⚫", green: "🟢" };

export default {
  name: "roulette",
  aliases: ["rl", "spin"],
  category: "economy",
  cooldown: 6,
  description: "Bet on the roulette wheel — red/black/even/odd or a specific number",
  usage: ".roulette <red|black|even|odd|0-36> <amount>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    // ── Cooldown ──────────────────────────────────────────────────────────
    if (now - (user.lastRoulette || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastRoulette)) / 1000);
      return reply(`🎡 The wheel is still spinning! Try again in *${secs}s*.`);
    }

    if (!args[0]) {
      return reply(
`🎡 *ROULETTE*

Usage: *.roulette <bet_type> <amount>*

Bet Types & Payouts:
  🔴 *red*    — ×2  (numbers 1,3,5...36)
  ⚫ *black*  — ×2  (numbers 2,4,6...35)
  *even*   — ×2  (2,4,6...36)
  *odd*    — ×2  (1,3,5...35)
  *0-36*   — ×36 (exact number)

Example: .roulette red 500  or  .roulette red 5m
Example: .roulette 7 1000  or  .roulette 7 1b
✦ Shorthand: *k* = thousand | *m* = million | *b* = billion`
      );
    }

    const betType  = args[0].toLowerCase();
    const rawAmt   = (args[1] || "").toLowerCase();

    if (!rawAmt) return reply("❌ Usage: *.roulette <bet_type> <amount>*");

    let amount = parseAmount(rawAmt, user.money);
    if (!amount || isNaN(amount) || amount < 50) return reply("❌ Minimum bet is *$50*.");
    if (amount > user.money) return reply(`❌ You only have *$${user.money.toLocaleString()}*.`);

    // Validate bet type
    const validSimple = ["red", "black", "even", "odd"];
    const numBet      = parseInt(betType, 10);
    const isNumBet    = !isNaN(numBet) && numBet >= 0 && numBet <= 36;

    if (!validSimple.includes(betType) && !isNumBet) {
      return reply("❌ Invalid bet type.\n\nChoose: *red*, *black*, *even*, *odd*, or a number *0-36*.");
    }

    // ── Spin! ─────────────────────────────────────────────────────────────
    user.lastRoulette = now;
    const result      = spinWheel();
    const color       = getColor(result);
    const isEven      = result !== 0 && result % 2 === 0;
    const emoji       = COLOR_EMOJI[color];

    let won = false;
    let multiplier = 0;

    if (isNumBet) {
      won = result === numBet;
      multiplier = 36;
    } else if (betType === "red") {
      won = color === "red";
      multiplier = 2;
    } else if (betType === "black") {
      won = color === "black";
      multiplier = 2;
    } else if (betType === "even") {
      won = isEven;
      multiplier = 2;
    } else if (betType === "odd") {
      won = result !== 0 && !isEven;
      multiplier = 2;
    }

    // 0 always loses on non-zero bets
    if (result === 0 && !isNumBet) won = false;

    const winnings = won ? amount * multiplier : 0;
    const net      = winnings - amount;
    user.money     = Math.max(0, user.money + net);
    user.xp        = (user.xp || 0) + 8;
    const diamondReward = maybeAwardDiamonds(user, won && multiplier >= 36 ? 0.008 : won ? 0.002 : 0.001, 1, 2);

    await saveUser(sender, user);
    await addHistory(sender, "roulette", net, `Roulette: ${betType} $${amount.toLocaleString()}`);

    return reply(
`🎡 *ROULETTE WHEEL*

The ball lands on... *${result}* ${emoji}
${result === 0 ? "🟢 Green — House wins!" : `${color === "red" ? "🔴 Red" : "⚫ Black"} | ${isEven ? "Even" : "Odd"}`}

🎯 Your bet: *${betType}* × $${amount.toLocaleString()}
${won
  ? `🏆 *WIN!* ×${multiplier} = +$${winnings.toLocaleString()}`
  : `💀 *LOSE!* -$${amount.toLocaleString()}`}

💰 Balance: $${user.money.toLocaleString()}${diamondReward ? `\n💎 Rare find: +${diamondReward} Diamond${diamondReward === 1 ? "" : "s"}` : ""}`
    );
  },
};
