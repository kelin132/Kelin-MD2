/**
 * KELIN MD — .pool (Investment Pool)
 * 3-person shared investment pool. All members deposit equally & share profits.
 *
 * Commands:
 *   .pool create <amount> <short|medium|long> @user1 @user2 — Start a pool & invite 2 others
 *   .pool join         — Accept an invitation to join a pool
 *   .pool status       — Check your pool's status
 *   .pool collect      — Collect profits when the investment matures
 *   .pool cancel       — Cancel pending pool (creator only)
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const POOL_SIZE = 3; // always exactly 3 members

const PLANS = {
  short:  { label: "Short-Term",  emoji: "⚡", duration: 5  * 60 * 1000,      minRet: 0.05, maxRet: 0.15, crashChance: 0.45, lossPct: 0.10, minAmt: 500 },
  medium: { label: "Medium-Term", emoji: "📊", duration: 30 * 60 * 1000,      minRet: 0.20, maxRet: 0.50, crashChance: 0.45, lossPct: 0.20, minAmt: 2000 },
  long:   { label: "Long-Term",   emoji: "🏦", duration: 2  * 60 * 60 * 1000, minRet: 0.50, maxRet: 1.20, crashChance: 0.45, lossPct: 0.30, minAmt: 10000 },
};

function fmtMs(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

async function getPool(id) {
  const db = await getDb();
  return db.collection("invest_pools").findOne({ $or: [{ creatorId: id }, { invitedJids: id }, { "members.jid": id }] });
}

async function savePool(data) {
  const db = await getDb();
  const { _id, ...rest } = data;
  await db.collection("invest_pools").updateOne(
    { poolId: data.poolId },
    { $set: rest },
    { upsert: true }
  );
}

async function deletePool(poolId) {
  const db = await getDb();
  await db.collection("invest_pools").deleteOne({ poolId });
}

export default {
  name: "pool",
  aliases: ["investpool", "ipool"],
  category: "economy",
  cooldown: 6,
  description: "3-person shared investment pool — split the profits!",
  usage: ".pool create <amount> <plan> @user1 @user2 | .pool join | .pool status | .pool collect",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const sub   = (args[0] || "status").toLowerCase();
    const now   = Date.now();

    // ── HELP ─────────────────────────────────────────────────────────────────
    if (sub === "help") {
      return reply(
`💼 *INVESTMENT POOL*

Pool your money with 2 friends and share the profits!

📋 *Commands:*
  *.pool create <amount> <plan> @user1 @user2*
       — Invite 2 people to invest together
  *.pool join*     — Join a pool you were invited to
  *.pool status*   — Check pool status
  *.pool collect*  — Collect returns when ready
  *.pool cancel*   — Cancel your pending pool

📊 *Plans:*
  ⚡ short  — 5 min  | 5–15% return  | $500 min each
  📊 medium — 30 min | 20–50% return | $2k min each
  🏦 long   — 2 hrs  | 50–120% return| $10k min each

⚠️ 45% crash risk on all plans. Profits split equally 3 ways.`
      );
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (sub === "create") {
      const existing = await getPool(sender);
      if (existing) return reply("❌ You already have an active pool!\n\nUse *.pool status* to view it.");

      const rawAmt  = (args[1] || "").toLowerCase();
      const planKey = (args[2] || "").toLowerCase();
      const plan    = PLANS[planKey];

      if (!rawAmt || !plan) {
        return reply("❌ Usage: *.pool create <amount> <short|medium|long> @user1 @user2*");
      }

      const amount = rawAmt === "all"  ? (await getUser(sender)).money
                   : rawAmt === "half" ? Math.floor((await getUser(sender)).money / 2)
                   : parseInt(rawAmt.replace(/\D/g, ""), 10);

      if (!amount || isNaN(amount)) return reply("❌ Enter a valid amount.");
      if (amount < plan.minAmt) return reply(`❌ Minimum deposit is $${plan.minAmt.toLocaleString()} for ${plan.label}.`);

      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (mentionedJids.length < 2) {
        return reply("❌ You need to invite exactly 2 users.\n\nUsage: *.pool create <amount> <plan> @user1 @user2*");
      }

      const user = await getUser(sender);
      if ((user.money || 0) < amount) return reply(`❌ You only have $${(user.money || 0).toLocaleString()}.`);

      // Deduct creator's deposit immediately
      user.money -= amount;
      await saveUser(sender, user);
      await addHistory(sender, "pool_deposit", -amount, `Pool deposit: ${planKey} plan`);

      const invitedJids = mentionedJids.slice(0, 2);
      const poolId = `pool_${sender}_${now}`;

      await savePool({
        poolId,
        creatorId:   sender,
        creatorName: user.name || sender.split("@")[0],
        plan:        planKey,
        amount,
        invitedJids,
        members: [{ jid: sender, name: user.name || sender.split("@")[0], joinedAt: now }],
        startedAt:  null,
        status:     "pending",
        payout:     null,
        createdAt:  now,
      });

      return await sock.sendMessage(jid, {
        text:
`💼 *INVESTMENT POOL CREATED!*

${plan.emoji} Plan    : ${plan.label}
💵 Each Deposit: $${amount.toLocaleString()}
📈 Return  : ${(plan.minRet * 100).toFixed(0)}–${(plan.maxRet * 100).toFixed(0)}%
⏰ Duration : ${fmtMs(plan.duration)}

📩 Invited: @${invitedJids[0].split("@")[0]} & @${invitedJids[1].split("@")[0]}
_(They must type *.pool join* to accept and deposit)_

Pool starts when all 3 members join!`,
        mentions: invitedJids,
      }, { quoted: msg });
    }

    // ── JOIN ──────────────────────────────────────────────────────────────────
    if (sub === "join") {
      const db   = await getDb();
      const pool = await db.collection("invest_pools").findOne({
        invitedJids: sender,
        status: "pending",
      });

      if (!pool) return reply("❌ You don't have a pending pool invitation.\n\nAsk someone to *.pool create* and tag you.");

      const already = pool.members.some(m => m.jid === sender);
      if (already) return reply("❌ You've already joined this pool!");

      const plan = PLANS[pool.plan];
      const user = await getUser(sender);

      if ((user.money || 0) < pool.amount) {
        return reply(`❌ You need $${pool.amount.toLocaleString()} to join.\nYou have: $${(user.money || 0).toLocaleString()}`);
      }

      // Deduct deposit
      user.money -= pool.amount;
      await saveUser(sender, user);
      await addHistory(sender, "pool_deposit", -pool.amount, `Joined investment pool: ${pool.plan} plan`);

      pool.members.push({ jid: sender, name: user.name || sender.split("@")[0], joinedAt: now });

      let responseText;
      if (pool.members.length >= POOL_SIZE) {
        // All 3 joined — start the investment
        pool.status     = "active";
        pool.startedAt  = now;
        const matureAt  = now + plan.duration;
        responseText =
`✅ *ALL MEMBERS JOINED!*

💼 Pool is now ACTIVE!
${plan.emoji} Plan    : ${plan.label}
💵 Each Deposit : $${pool.amount.toLocaleString()}
💰 Total Pool   : $${(pool.amount * POOL_SIZE).toLocaleString()}
⏰ Matures in   : ${fmtMs(plan.duration)}

Use *.pool collect* when ready!`;
      } else {
        responseText =
`✅ @${sender.split("@")[0]} joined the pool!

💵 Deposited: $${pool.amount.toLocaleString()}
👥 Members: ${pool.members.length}/${POOL_SIZE}

Waiting for more members to join…`;
      }

      await savePool(pool);

      return await sock.sendMessage(jid, {
        text: responseText,
        mentions: pool.members.map(m => m.jid),
      }, { quoted: msg });
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === "status") {
      const pool = await getPool(sender);
      if (!pool) return reply("❌ No active pool found.\n\nCreate one with *.pool create <amount> <plan> @user1 @user2*");

      const plan = PLANS[pool.plan];
      const matureAt = pool.startedAt ? pool.startedAt + plan.duration : null;
      const matured  = matureAt && now >= matureAt;

      const memberList = pool.members.map((m, i) =>
        `  ${i + 1}. @${m.jid.split("@")[0]}`
      ).join("\n");

      const statusEmoji = pool.status === "pending" ? "⏳" : pool.status === "active" ? "🟢" : "✅";

      return await sock.sendMessage(jid, {
        text:
`💼 *INVESTMENT POOL STATUS*

${plan.emoji} Plan   : ${plan.label}
💵 Each Deposit: $${pool.amount.toLocaleString()}
💰 Total Pool  : $${(pool.amount * pool.members.length).toLocaleString()}
${statusEmoji} Status  : ${pool.status.toUpperCase()}

👥 *Members (${pool.members.length}/${POOL_SIZE}):*
${memberList}

${pool.status === "pending"
  ? `⏳ Waiting for ${POOL_SIZE - pool.members.length} more member(s).\nInvited to join: *.pool join*`
  : matured
    ? "✅ *Ready to collect!* Use *.pool collect*"
    : `⏰ Matures in: *${fmtMs(matureAt - now)}*`
}`,
        mentions: pool.members.map(m => m.jid),
      }, { quoted: msg });
    }

    // ── COLLECT ───────────────────────────────────────────────────────────────
    if (sub === "collect") {
      const pool = await getPool(sender);
      if (!pool)                         return reply("❌ No active pool found.");
      if (pool.status !== "active")      return reply("❌ Pool hasn't started yet — waiting for all members to join.");
      if (!pool.members.some(m => m.jid === sender)) return reply("❌ You're not a member of this pool!");

      const plan     = PLANS[pool.plan];
      const matureAt = pool.startedAt + plan.duration;

      if (now < matureAt) {
        return reply(`⏳ Pool hasn't matured yet!\n\nMatures in *${fmtMs(matureAt - now)}*.`);
      }

      if (pool.status === "completed") {
        return reply("✅ This pool has already been collected.");
      }

      // Determine outcome
      const crashed      = Math.random() < plan.crashChance;
      const totalDeposit = pool.amount * POOL_SIZE;
      let totalPayout, profitPerMember, netPerMember;

      if (crashed) {
        const lostPct   = plan.lossPct;
        totalPayout     = totalDeposit - Math.floor(totalDeposit * lostPct);
        profitPerMember = Math.floor(totalPayout / POOL_SIZE);
        netPerMember    = profitPerMember - pool.amount;
      } else {
        const retPct    = plan.minRet + Math.random() * (plan.maxRet - plan.minRet);
        totalPayout     = totalDeposit + Math.floor(totalDeposit * retPct);
        profitPerMember = Math.floor(totalPayout / POOL_SIZE);
        netPerMember    = profitPerMember - pool.amount;
      }

      // Pay each member
      for (const m of pool.members) {
        const u = await getUser(m.jid);
        u.money = (u.money || 0) + profitPerMember;
        await saveUser(m.jid, u);
        await addHistory(m.jid, "pool_collect", netPerMember,
          `Pool ${crashed ? "loss" : "profit"}: ${plan.label}`);
      }

      pool.status = "completed";
      pool.payout = profitPerMember;
      await savePool(pool);

      // Delete pool after 1 minute
      setTimeout(() => deletePool(pool.poolId).catch(() => {}), 60_000);

      return await sock.sendMessage(jid, {
        text:
`${plan.emoji} *POOL INVESTMENT COLLECTED!*

${crashed
  ? `📉 *Market crashed!* Lost ${(plan.lossPct * 100).toFixed(0)}%`
  : `📈 *Profit!* Great returns for everyone!`
}

💰 Total Pool   : $${totalDeposit.toLocaleString()}
💵 Each Received: $${profitPerMember.toLocaleString()}
${netPerMember >= 0 ? `📈 Each Profit` : `📉 Each Loss`}  : ${netPerMember >= 0 ? "+" : ""}$${netPerMember.toLocaleString()}

👥 Paid to all ${POOL_SIZE} members!`,
        mentions: pool.members.map(m => m.jid),
      }, { quoted: msg });
    }

    // ── CANCEL ────────────────────────────────────────────────────────────────
    if (sub === "cancel") {
      const pool = await getPool(sender);
      if (!pool) return reply("❌ No active pool found.");
      if (pool.creatorId !== sender) return reply("❌ Only the pool creator can cancel it.");
      if (pool.status !== "pending")  return reply("❌ Can only cancel pending pools (before all members join).");

      // Refund all joined members
      for (const m of pool.members) {
        const u = await getUser(m.jid);
        u.money = (u.money || 0) + pool.amount;
        await saveUser(m.jid, u);
        await addHistory(m.jid, "pool_refund", pool.amount, "Pool cancelled — refunded");
      }

      await deletePool(pool.poolId);
      return reply(`❌ *Pool cancelled!*\n\n💰 $${pool.amount.toLocaleString()} refunded to all ${pool.members.length} joined member(s).`);
    }

    return reply("❌ Unknown command.\n\nType *.pool help* for all pool commands.");
  },
};
