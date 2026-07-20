/**
 * .loan <amount>   — take a loan (max $5,000, 5% interest/day, due in 7 days)
 * .loan pay        — repay your active loan
 * .loan info       — check your loan status
 */
import { getUser, saveUser, requireRegistration, addHistory, jailUser } from "./database.js";

const MAX_LOAN     = 5_000;
const INTEREST_PCT = 0.05; // 5% per day
const DUE_DAYS     = 7;

export default {
  name: "loan",
  aliases: ["borrow"],
  category: "economy",
  description: "Borrow money — 5% daily interest, due in 7 days",
  usage: ".loan <amount>  |  .loan pay  |  .loan info",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "info").toLowerCase();
    const now   = Date.now();

    const user = await getUser(sender);

    // ── INFO ─────────────────────────────────────────────────────────────────
    if (sub === "info") {
      if (!user.loan?.active) return reply("💳 You have no active loan.\n\nUse *.loan <amount>* to borrow up to $5,000.");

      const days    = Math.max(0, Math.ceil((user.loan.due - now) / 86_400_000));
      const overdue = now > user.loan.due;

      return reply(
`💳 *YOUR LOAN*

💸 Principal : $${user.loan.amount.toLocaleString()}
💹 Interest  : 5%/day
📅 Due       : ${new Date(user.loan.due).toDateString()}
${overdue ? "⚠️ *OVERDUE! Pay now to avoid jail.*" : `⏳ Due in   : ${days} day(s)`}

Repay total : ~$${Math.round(user.loan.amount * (1 + INTEREST_PCT * Math.max(0, DUE_DAYS - days))).toLocaleString()}
Use *.loan pay* to repay.`
      );
    }

    // ── PAY ──────────────────────────────────────────────────────────────────
    if (sub === "pay") {
      if (!user.loan?.active) return reply("❌ You don't have an active loan.");

      const daysUsed = Math.max(1, Math.ceil((now - user.loan.issuedAt) / 86_400_000));
      const interest = Math.round(user.loan.amount * INTEREST_PCT * daysUsed);
      const total    = user.loan.amount + interest;

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
      await addHistory(sender, "withdraw", -total, `Repaid loan ($${user.loan?.amount ?? 0} + $${interest} interest)`);

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

    const amount = parseInt(sub);
    if (isNaN(amount) || amount <= 0) return reply("❌ Usage: .loan <amount>\n\nMax loan: $5,000");
    if (amount > MAX_LOAN)            return reply(`❌ Maximum loan is $${MAX_LOAN.toLocaleString()}.`);
    if (amount < 100)                 return reply("❌ Minimum loan is $100.");

    user.money += amount;
    user.loan   = {
      active:   true,
      amount,
      issuedAt: now,
      due:      now + DUE_DAYS * 86_400_000,
      interest: INTEREST_PCT,
    };

    await saveUser(sender, user);
    await addHistory(sender, "transfer_in", amount, `Took loan of $${amount.toLocaleString()}`);

    return reply(
`💳 *LOAN APPROVED!*

💵 Received : $${amount.toLocaleString()}
📅 Due Date : ${new Date(user.loan.due).toDateString()}
💹 Interest : 5% per day

⚠️ Repay on time with *.loan pay*
Overdue loans result in *jail*!
💵 New Balance: $${user.money.toLocaleString()}`
    );
  },
};
