/**
 * .loan <amount>   — take a level-based bank loan
 * .loan pay        — repay your active loan
 * .loan info       — check your loan status
 * .loan tiers      — view available loan tiers
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { parseAmount } from "./parseAmount.js";

export const LOAN_TIERS = [
  { key: "starter", level: 1,  name: "Starter",  max: 5_000,       interest: 0.08, dueDays: 7  },
  { key: "bronze",  level: 5,  name: "Bronze",   max: 25_000,      interest: 0.07, dueDays: 10 },
  { key: "silver",  level: 10, name: "Silver",   max: 100_000,     interest: 0.06, dueDays: 14 },
  { key: "gold",    level: 20, name: "Gold",     max: 500_000,     interest: 0.05, dueDays: 21 },
  { key: "diamond", level: 35, name: "Diamond",  max: 2_500_000,   interest: 0.04, dueDays: 30 },
  { key: "elite",   level: 50, name: "Elite",    max: 10_000_000,  interest: 0.03, dueDays: 45 },
];

function getLoanTier(level = 1) {
  return [...LOAN_TIERS].reverse().find((tier) => level >= tier.level) || LOAN_TIERS[0];
}

function loanTierLines(level) {
  return LOAN_TIERS.map((tier) =>
    `${level >= tier.level ? "✅" : "🔒"} *${tier.name}* — Level ${tier.level}+ | max $${tier.max.toLocaleString()} | ${tier.interest * 100}%/day`
  ).join("\n");
}

export default {
  name: "loan",
  aliases: ["borrow"],
  category: "economy",
  cooldown: 6,
  description: "Borrow more money as your level increases",
  usage: ".loan <amount> | .loan pay | .loan info | .loan tiers",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "info").toLowerCase();
    const now   = Date.now();

    const user = await getUser(sender);
    const tier = getLoanTier(user.level || 1);

    if (sub === "tiers" || sub === "tier") {
      return reply(
`🏦 *BANK LOAN TIERS*

Your level: *${user.level || 1}*
Higher levels unlock larger loans and better rates.

${loanTierLines(user.level || 1)}

Use *.loan <amount>* to borrow within your unlocked tier.`
      );
    }

    // ── INFO ─────────────────────────────────────────────────────────────────
    if (sub === "info") {
      if (!user.loan?.active) return reply(`💳 You have no active loan.\n\nUse *.loan <amount>* to borrow up to $${tier.max.toLocaleString()}.\nUse *.loan tiers* to see the bank tiers.`);

      const days    = Math.max(0, Math.ceil((user.loan.due - now) / 86_400_000));
      const overdue = now > user.loan.due;
      const activeTier = LOAN_TIERS.find((entry) => entry.key === user.loan.tier) ||
        { ...LOAN_TIERS[0], interest: user.loan.interest ?? LOAN_TIERS[0].interest };
      const daysUsed = Math.max(1, Math.ceil((now - user.loan.issuedAt) / 86_400_000));
      const repayTotal = user.loan.amount + Math.round(user.loan.amount * activeTier.interest * daysUsed);

      return reply(
`💳 *YOUR LOAN*

🏷️ Tier      : ${activeTier.name}
💸 Principal : $${user.loan.amount.toLocaleString()}
💹 Interest  : ${activeTier.interest * 100}%/day
📅 Due       : ${new Date(user.loan.due).toDateString()}
${overdue ? "⚠️ *OVERDUE! Pay now to avoid jail.*" : `⏳ Due in   : ${days} day(s)`}

Repay total : ~$${repayTotal.toLocaleString()}
Use *.loan pay* to repay.`
      );
    }

    // ── PAY ──────────────────────────────────────────────────────────────────
    if (sub === "pay") {
      if (!user.loan?.active) return reply("❌ You don't have an active loan.");

      const activeTier = LOAN_TIERS.find((entry) => entry.key === user.loan.tier) ||
        { ...LOAN_TIERS[0], interest: user.loan.interest ?? LOAN_TIERS[0].interest };
      const daysUsed = Math.max(1, Math.ceil((now - user.loan.issuedAt) / 86_400_000));
      const interest = Math.round(user.loan.amount * activeTier.interest * daysUsed);
      const total    = user.loan.amount + interest;
      const principal = user.loan.amount;

      if (user.money < total) {
        return reply(
`❌ *Not enough cash!*

💸 Loan + interest : $${total.toLocaleString()}
💵 Your wallet     : $${user.money.toLocaleString()}
📉 Short           : $${(total - user.money).toLocaleString()}

Earn more with *.daily*, *.work*, *.dig* or *.fish*.`
        );
      }

      user.money   -= total;
      user.loan     = null;
      await saveUser(sender, user);
      await addHistory(sender, "withdraw", -total, `Repaid loan ($${principal} + $${interest} interest)`);

      return reply(
`✅ *Loan Repaid!*

💸 Repaid  : $${total.toLocaleString()}
  (principal + $${interest.toLocaleString()} interest)
💵 Balance : $${user.money.toLocaleString()}

You're debt free! 🎉`
      );
    }

    // ── TAKE LOAN ─────────────────────────────────────────────────────────────
    if (user.loan?.active) {
      return reply("❌ You already have an active loan.\n\nUse *.loan pay* to repay it first.");
    }

    const amount = parseAmount(sub, 0);
    if (isNaN(amount) || amount <= 0) return reply(`❌ Usage: .loan <amount>\n\nYour ${tier.name} tier maximum is $${tier.max.toLocaleString()}.\nUse *.loan tiers* to view unlocks.`);
    if (amount > tier.max)            return reply(`❌ Your ${tier.name} tier maximum is $${tier.max.toLocaleString()}.\nReach Level ${LOAN_TIERS.find((entry) => entry.max > tier.max)?.level || "higher"} to unlock more.`);
    if (amount < 100)                 return reply("❌ Minimum loan is $100.");

    user.money += amount;
    user.loan   = {
      active:   true,
      amount,
      tier: tier.key,
      issuedAt: now,
      due:      now + tier.dueDays * 86_400_000,
      interest: tier.interest,
    };

    await saveUser(sender, user);
    await addHistory(sender, "transfer_in", amount, `Took loan of $${amount.toLocaleString()}`);

    return reply(
`💳 *LOAN APPROVED!*

💵 Received : $${amount.toLocaleString()}
🏷️ Tier      : ${tier.name}
📅 Due Date : ${new Date(user.loan.due).toDateString()}
💹 Interest : ${tier.interest * 100}% per day

⚠️ Repay on time with *.loan pay*
Overdue loans result in *jail*!
💵 New Balance: $${user.money.toLocaleString()}`
    );
  },
};
