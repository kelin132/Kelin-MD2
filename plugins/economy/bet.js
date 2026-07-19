/**
 * KELIN MD — .bet
 * Gamble a chosen amount of cash. 50/50 win or lose.
 * Usage: .bet <amount|all|half>
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 30 * 1000; // 30 seconds between bets

// Possible outcomes — adds flavour without changing the 50/50 odds
const WIN_LINES = [
  "🎰 Jackpot! The dice rolled in your favour!",
  "🍀 Lucky break! You walked away richer!",
  "🎲 High roller! You doubled down and won!",
  "💫 The stars aligned — you won!",
  "🔥 On fire! You're on a winning streak!",
];

const LOSE_LINES = [
  "💀 Tough luck. The house always wins.",
  "😬 Ouch. Should've stopped while you were ahead.",
  "🎲 The dice betrayed you. Better luck next time.",
  "💸 Gone in seconds. Easy come, easy go.",
  "🌧️ Rough roll. Your wallet is crying.",
];

export default {
  name: "bet",
  description: "Gamble your cash — win or lose",
  category: "economy",
  usage: ".bet <amount | all | half>",
  aliases: ["gamble", "wager"],
  cooldown: 2,
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const user = await getUser(sender);
    const now  = Date.now();

    // ── Cooldown ──────────────────────────────────────────────────────────
    if (now - (user.lastBet || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastBet)) / 1000);
      return sock.sendMessage(jid, {
        text: `⏳ Slow down! You can bet again in *${secs}s*.`,
      }, { quoted: msg });
    }

    // ── Parse amount ──────────────────────────────────────────────────────
    const raw = args[0]?.toLowerCase();

    if (!raw) {
      return sock.sendMessage(jid, {
        text:
`🎲 *BET*

Usage:
  *.bet <amount>* — e.g. .bet 500
  *.bet all*      — bet everything in your wallet
  *.bet half*     — bet half your wallet

💵 Wallet: $${user.money.toLocaleString()}`,
      }, { quoted: msg });
    }

    let amount;
    if (raw === "all") {
      amount = user.money;
    } else if (raw === "half") {
      amount = Math.floor(user.money / 2);
    } else {
      amount = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return sock.sendMessage(jid, {
        text: "❌ Enter a valid amount. Example: *.bet 500*",
      }, { quoted: msg });
    }

    if (amount > user.money) {
      return sock.sendMessage(jid, {
        text: `❌ You only have *$${user.money.toLocaleString()}* in your wallet.\n\nYou can't bet more than you have.`,
      }, { quoted: msg });
    }

    if (amount < 10) {
      return sock.sendMessage(jid, {
        text: "❌ Minimum bet is *$10*.",
      }, { quoted: msg });
    }

    // ── Resolve outcome — straight 50/50 ─────────────────────────────────
    const won      = Math.random() < 0.5;
    const flavour  = won
      ? WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)]
      : LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)];

    user.lastBet = now;

    if (won) {
      user.money += amount;
      user.xp     = (user.xp || 0) + 15;
      await saveUser(sender, user);
      await addHistory(sender, "bet", +amount, `Bet won — wagered $${amount.toLocaleString()}`);

      return sock.sendMessage(jid, {
        text:
`${flavour}

🎲 *BET RESULT — WIN* 🟢

💵 Wagered : $${amount.toLocaleString()}
📈 Won     : +$${amount.toLocaleString()}
💰 Wallet  : $${user.money.toLocaleString()}`,
      }, { quoted: msg });

    } else {
      user.money = Math.max(0, user.money - amount);
      await saveUser(sender, user);
      await addHistory(sender, "bet", -amount, `Bet lost — wagered $${amount.toLocaleString()}`);

      return sock.sendMessage(jid, {
        text:
`${flavour}

🎲 *BET RESULT — LOSE* 🔴

💵 Wagered : $${amount.toLocaleString()}
📉 Lost    : -$${amount.toLocaleString()}
💰 Wallet  : $${user.money.toLocaleString()}`,
      }, { quoted: msg });
    }
  },
};
