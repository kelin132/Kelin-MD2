/**
 * KELIN MD — .slots
 * Spin the slot machine — match symbols to win big!
 * Usage: .slots <amount>
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 15 * 1000; // 15 seconds

const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣", "🃏"];

// Payout multipliers for matching 3 symbols
const PAYOUTS = {
  "7️⃣": 10,   // jackpot
  "💎": 7,
  "🔔": 5,
  "🍇": 4,
  "🍊": 3,
  "🍋": 2.5,
  "🍒": 2,
  "🃏": 1.5,
};

// Weighted symbol pool (commons appear more)
const SYMBOL_POOL = [
  ...Array(6).fill("🍒"),
  ...Array(5).fill("🍋"),
  ...Array(5).fill("🍊"),
  ...Array(4).fill("🍇"),
  ...Array(3).fill("🔔"),
  ...Array(2).fill("💎"),
  ...Array(1).fill("7️⃣"),
  ...Array(2).fill("🃏"),
];

function spin() {
  return [0, 0, 0].map(() => SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)]);
}

export default {
  name: "slots",
  aliases: ["slot", "slotmachine"],
  category: "economy",
  description: "Spin the slot machine — match 3 symbols to win!",
  usage: ".slots <amount>",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    // ── Cooldown ──────────────────────────────────────────────────────────
    if (now - (user.lastSlots || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastSlots)) / 1000);
      return reply(`🎰 The machine needs to cool down! Try again in *${secs}s*.`);
    }

    // ── Parse amount ──────────────────────────────────────────────────────
    const raw = (args[0] || "").toLowerCase();
    if (!raw) {
      return reply(
`🎰 *SLOT MACHINE*

Usage: *.slots <amount>*
Min bet: $50  |  Max bet: $50,000

💎 Payouts (match 3):
  7️⃣ — ×10  (Jackpot!)
  💎 — ×7
  🔔 — ×5
  🍇 — ×4
  🍊 — ×3
  🍋 — ×2.5
  🍒 — ×2
  🃏 — ×1.5
  2 matching — ×0.5 (partial win)`
      );
    }

    let amount = raw === "all" ? user.money : raw === "half" ? Math.floor(user.money / 2) : parseInt(raw.replace(/\D/g, ""), 10);

    if (!amount || isNaN(amount) || amount < 50) return reply("❌ Minimum bet is *$50*.");
    if (amount > 50000)  return reply("❌ Maximum bet is *$50,000*.");
    if (amount > user.money) return reply(`❌ You only have *$${user.money.toLocaleString()}*.`);

    // ── Spin! ─────────────────────────────────────────────────────────────
    user.lastSlots = now;
    const reels = spin();
    const [a, b, c] = reels;

    let winnings = 0;
    let resultMsg = "";

    if (a === b && b === c) {
      // 3 of a kind
      const mult = PAYOUTS[a] || 2;
      winnings = Math.floor(amount * mult);
      resultMsg = `🎉 *JACKPOT!* Three ${a}s! ×${mult}`;
    } else if (a === b || b === c || a === c) {
      // 2 matching
      winnings = Math.floor(amount * 0.5);
      resultMsg = `✨ *Partial Win!* Two matching — ×0.5`;
    } else {
      winnings = 0;
      resultMsg = `😭 *No Match!* Better luck next spin.`;
    }

    const net = winnings - amount;
    user.money = Math.max(0, user.money + net);
    user.xp    = (user.xp || 0) + 5;

    await saveUser(sender, user);
    await addHistory(sender, "slots", net, `Slots: bet $${amount.toLocaleString()}`);

    return reply(
`🎰 *SLOT MACHINE*

[ ${a} | ${b} | ${c} ]

${resultMsg}

💵 Bet     : $${amount.toLocaleString()}
${winnings > 0 ? `💰 Won     : +$${winnings.toLocaleString()}` : `💸 Lost    : -$${amount.toLocaleString()}`}
🏦 Balance : $${user.money.toLocaleString()}`
    );
  },
};
