/**
 * KELIN MD — .invest
 * Invest money for returns after a set duration.
 * Usage: .invest <amount> <short|medium|long>
 *        .invest collect   — collect your matured investment
 *        .invest status    — check investment status
 *
 * Short  : 5 min  → 5–15% return (or -10% loss)
 * Medium : 30 min → 20–50% return (or -20% loss)
 * Long   : 2 hrs  → 50–120% return (or -30% loss)
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const PLANS = {
  short: {
    label:    "Short-Term",
    emoji:    "⚡",
    duration: 5 * 60 * 1000,      // 5 minutes
    minRet:   0.05,
    maxRet:   0.15,
    lossChance: 0.20,              // 20% chance to lose money
    lossPct:  0.10,
    minAmt:   500,
  },
  medium: {
    label:    "Medium-Term",
    emoji:    "📊",
    duration: 30 * 60 * 1000,     // 30 minutes
    minRet:   0.20,
    maxRet:   0.50,
    lossChance: 0.15,
    lossPct:  0.20,
    minAmt:   2000,
  },
  long: {
    label:    "Long-Term",
    emoji:    "🏦",
    duration: 2 * 60 * 60 * 1000, // 2 hours
    minRet:   0.50,
    maxRet:   1.20,
    lossChance: 0.10,
    lossPct:  0.30,
    minAmt:   10000,
  },
};

function fmtMs(ms) {
  const hrs  = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (hrs > 0)  return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default {
  name: "invest",
  aliases: ["investment", "stock"],
  category: "economy",
  description: "Invest money and collect returns after a set duration",
  usage: ".invest <amount> <short|medium|long>  |  .invest collect  |  .invest status",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const now   = Date.now();
    const user  = await getUser(sender);

    const sub = (args[0] || "").toLowerCase();

    // ── STATUS ────────────────────────────────────────────────────────────
    if (sub === "status") {
      const inv = user.activeInvestment;
      if (!inv) return reply("📊 You have no active investment.\n\nUse *.invest <amount> <plan>* to start one.");

      const plan     = PLANS[inv.plan];
      const maturesAt = inv.startedAt + plan.duration;
      const matured  = now >= maturesAt;

      return reply(
`📊 *INVESTMENT STATUS*

${plan.emoji} Plan    : ${plan.label}
💵 Amount  : $${inv.amount.toLocaleString()}
📅 Started : ${new Date(inv.startedAt).toLocaleTimeString()}
⏰ Matures : ${matured ? "*NOW — Ready to collect!*" : `in ${fmtMs(maturesAt - now)}`}

${matured ? "✅ Use *.invest collect* to collect your returns!" : "⏳ Come back when the timer is up."}`
      );
    }

    // ── COLLECT ───────────────────────────────────────────────────────────
    if (sub === "collect") {
      const inv = user.activeInvestment;
      if (!inv) return reply("❌ You have no active investment to collect.");

      const plan     = PLANS[inv.plan];
      const maturesAt = inv.startedAt + plan.duration;

      if (now < maturesAt) {
        return reply(`⏳ Your investment hasn't matured yet!\n\nCome back in *${fmtMs(maturesAt - now)}*.`);
      }

      // Determine outcome
      const lost     = Math.random() < plan.lossChance;
      let payout, net;

      if (lost) {
        const lostAmt = Math.floor(inv.amount * plan.lossPct);
        payout = inv.amount - lostAmt;
        net    = -lostAmt;
      } else {
        const returnPct = plan.minRet + Math.random() * (plan.maxRet - plan.minRet);
        const profit    = Math.floor(inv.amount * returnPct);
        payout = inv.amount + profit;
        net    = profit;
      }

      user.money = Math.max(0, (user.money || 0) + payout);
      delete user.activeInvestment;
      user.xp    = (user.xp || 0) + 20;

      await saveUser(sender, user);
      await addHistory(sender, "invest", net, `Investment collected: ${inv.plan} plan`);

      return reply(
`${plan.emoji} *INVESTMENT COLLECTED!*

📌 Plan   : ${plan.label}
💰 Invested: $${inv.amount.toLocaleString()}
${lost
  ? `📉 *Market crashed!* Lost ${(plan.lossPct * 100).toFixed(0)}% — -$${(inv.amount - payout).toLocaleString()}`
  : `📈 *Profit!* +$${net.toLocaleString()} (${(net / inv.amount * 100).toFixed(1)}% return)`}

💵 Received : $${payout.toLocaleString()}
🏦 Balance  : $${user.money.toLocaleString()}`
      );
    }

    // ── NEW INVESTMENT ────────────────────────────────────────────────────
    if (!args[0] || !args[1] || !PLANS[args[1]?.toLowerCase()]) {
      return reply(
`🏦 *INVESTMENT*

Grow your money over time!

Plans:
  ⚡ *.invest <amt> short*  — 5 min  | +5–15% return | $500 min
  📊 *.invest <amt> medium* — 30 min | +20–50% return | $2k min
  🏦 *.invest <amt> long*   — 2 hrs  | +50–120% return | $10k min

Small risk of market crash. Collect with *.invest collect*.

_Only one active investment at a time._`
      );
    }

    if (user.activeInvestment) {
      const plan = PLANS[user.activeInvestment.plan];
      const maturesAt = user.activeInvestment.startedAt + plan.duration;
      return reply(`❌ You already have an active ${plan.label} investment!\n\nUse *.invest status* or collect it first with *.invest collect*.${now >= maturesAt ? "\n\n✅ It's ready to collect now!" : ""}`);
    }

    const planKey = args[1].toLowerCase();
    const plan    = PLANS[planKey];
    const rawAmt  = (args[0] || "").toLowerCase();

    let amount = rawAmt === "all" ? user.money : rawAmt === "half" ? Math.floor(user.money / 2) : parseInt(rawAmt.replace(/\D/g, ""), 10);

    if (!amount || isNaN(amount)) return reply("❌ Enter a valid amount. Example: *.invest 5000 medium*");
    if (amount < plan.minAmt)     return reply(`❌ Minimum investment for ${plan.label} is *$${plan.minAmt.toLocaleString()}*.`);
    if (amount > user.money)      return reply(`❌ You only have *$${user.money.toLocaleString()}*.`);

    user.money -= amount;
    user.activeInvestment = { plan: planKey, amount, startedAt: now };

    await saveUser(sender, user);
    await addHistory(sender, "invest", -amount, `Started ${planKey} investment: $${amount.toLocaleString()}`);

    return reply(
`${plan.emoji} *INVESTMENT STARTED!*

📌 Plan    : ${plan.label}
💵 Amount  : $${amount.toLocaleString()}
⏰ Matures : in ${fmtMs(plan.duration)}
📈 Return  : ${(plan.minRet * 100).toFixed(0)}–${(plan.maxRet * 100).toFixed(0)}%

Come back in *${fmtMs(plan.duration)}* and use *.invest collect*!
🏦 Remaining balance: $${user.money.toLocaleString()}`
    );
  },
};
