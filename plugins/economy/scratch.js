/**
 * KELIN MD — .scratch
 * Buy a scratch card and reveal instant prizes!
 * Usage: .scratch [type]
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const COOLDOWN = 10 * 1000; // 10 seconds

const CARDS = {
  basic: {
    price: 100,
    emoji: "🎫",
    label: "Basic",
    prizes: [
      { reward: 0,    label: "❌ Nothing",      weight: 40 },
      { reward: 50,   label: "💵 $50",          weight: 25 },
      { reward: 150,  label: "💵 $150",         weight: 15 },
      { reward: 300,  label: "💰 $300",         weight: 10 },
      { reward: 750,  label: "💰 $750",         weight:  6 },
      { reward: 2000, label: "💎 $2,000",       weight:  3 },
      { reward: 5000, label: "🏆 JACKPOT $5,000!", weight: 1 },
    ],
  },
  silver: {
    price: 500,
    emoji: "🥈",
    label: "Silver",
    prizes: [
      { reward: 0,     label: "❌ Nothing",         weight: 30 },
      { reward: 250,   label: "💵 $250",            weight: 22 },
      { reward: 800,   label: "💵 $800",            weight: 18 },
      { reward: 2000,  label: "💰 $2,000",          weight: 14 },
      { reward: 5000,  label: "💰 $5,000",          weight:  9 },
      { reward: 12000, label: "💎 $12,000",         weight:  5 },
      { reward: 25000, label: "🏆 JACKPOT $25,000!", weight: 2 },
    ],
  },
  gold: {
    price: 2000,
    emoji: "🥇",
    label: "Gold",
    prizes: [
      { reward: 0,      label: "❌ Nothing",           weight: 20 },
      { reward: 1000,   label: "💵 $1,000",            weight: 20 },
      { reward: 4000,   label: "💵 $4,000",            weight: 18 },
      { reward: 10000,  label: "💰 $10,000",           weight: 15 },
      { reward: 25000,  label: "💰 $25,000",           weight: 12 },
      { reward: 60000,  label: "💎 $60,000",           weight:  9 },
      { reward: 150000, label: "🏆 JACKPOT $150,000!", weight:  6 },
    ],
  },
};

function rollPrize(prizes) {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

export default {
  name: "scratch",
  aliases: ["scratchcard", "scratchy"],
  category: "economy",
  description: "Buy a scratch card for an instant prize!",
  usage: ".scratch [basic|silver|gold]",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    // ── Cooldown ──────────────────────────────────────────────────────────
    if (now - (user.lastScratch || 0) < COOLDOWN) {
      const secs = Math.ceil((COOLDOWN - (now - user.lastScratch)) / 1000);
      return reply(`🎫 Hold on! You can scratch again in *${secs}s*.`);
    }

    const type = (args[0] || "basic").toLowerCase();
    const card = CARDS[type];

    if (!card) {
      return reply(
`🎫 *SCRATCH CARDS*

Choose a card:
  🎫 *.scratch basic*  — $100  (small prizes)
  🥈 *.scratch silver* — $500  (medium prizes)
  🥇 *.scratch gold*   — $2,000 (big prizes!)

Type *.scratch <type>* to buy and scratch instantly!`
      );
    }

    if (user.money < card.price) {
      return reply(`❌ You need *$${card.price.toLocaleString()}* for a ${card.label} scratch card.\nYou have: *$${user.money.toLocaleString()}*`);
    }

    user.lastScratch = now;
    user.money      -= card.price;

    const prize = rollPrize(card.prizes);

    if (prize.reward > 0) {
      user.money += prize.reward;
      user.xp     = (user.xp || 0) + 10;
    }

    const net = prize.reward - card.price;
    await saveUser(sender, user);
    await addHistory(sender, "scratch", net, `Scratch ${type}: ${prize.label}`);

    const isJackpot = prize.reward >= 25000;

    return reply(
`${card.emoji} *${card.label.toUpperCase()} SCRATCH CARD*

🔲 🔲 🔲
✨ Scratching...

🎴 Result: *${prize.label}*

${prize.reward > 0
  ? `${isJackpot ? "🎊🎊🎊 HUGE WIN! 🎊🎊🎊\n" : ""}💰 Prize: +$${prize.reward.toLocaleString()}`
  : "😔 No prize this time!"}

💵 Card cost : -$${card.price.toLocaleString()}
💰 Balance   : $${user.money.toLocaleString()}`
    );
  },
};
