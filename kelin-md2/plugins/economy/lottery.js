/**
 * .lottery buy [tickets]  — buy lottery tickets ($500 each, max 10 per person)
 * .lottery draw           — owner-only: draw the winning ticket
 * .lottery info           — show jackpot + your tickets
 */
import { getUser, saveUser, requireRegistration, addHistory, getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const TICKET_PRICE  = 500;
const MAX_TICKETS   = 10;
const MIN_JACKPOT   = 10_000_000;
const MAX_JACKPOT   = 50_000_000;

function randomBaseJackpot() {
  return Math.floor(Math.random() * (MAX_JACKPOT - MIN_JACKPOT + 1)) + MIN_JACKPOT;
}

async function getLottery() {
  const db  = getDb();
  let doc   = await db.collection("lottery").findOne({ _id: "current" });
  if (!doc) {
    const base = randomBaseJackpot();
    doc = { _id: "current", tickets: [], totalTickets: 0, jackpot: base, baseJackpot: base, createdAt: new Date() };
    await db.collection("lottery").insertOne(doc);
  }
  return doc;
}

async function saveLottery(data) {
  const { _id, ...rest } = data;
  await getDb().collection("lottery").updateOne({ _id: "current" }, { $set: rest }, { upsert: true });
}

export default {
  name: "lottery",
  aliases: ["lotto"],
  category: "economy",
  cooldown: 6,
  description: "Buy lottery tickets or draw the jackpot",
  usage: ".lottery buy [amount]  |  .lottery draw  |  .lottery info",

  async run({ sock, msg, sender, args, isOwner, staffLevel }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub  = (args[0] || "info").toLowerCase();

    // ── INFO ───────────────────────────────────────────────────────────────────
    if (sub === "info") {
      const lot      = await getLottery();
      const myCount  = lot.tickets.filter(t => t.userId === sender.split("@")[0]).reduce((s, t) => s + t.count, 0);
      const chance   = lot.totalTickets > 0 ? ((myCount / lot.totalTickets) * 100).toFixed(1) : "0.0";
      return reply(
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑰𝑵𝑭𝑶 🎟️ 〕━━━╮
┃ ✦ Try your luck — win big!
┃
┃ 💰 Jackpot      › $${lot.jackpot.toLocaleString()}
┃ 🎫 Total Tickets › ${lot.totalTickets}
┃ 🎟️  Your Tickets  › ${myCount}
┃ 🎯 Your Chance  › ${chance}%
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 🏷️  Price › $${TICKET_PRICE.toLocaleString()} per ticket
┃ 🔒 Max   › ${MAX_TICKETS} tickets per player
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 .lottery buy <n>  — buy tickets
┃ 💡 .lotterylist      — see all players
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    // ── BUY ────────────────────────────────────────────────────────────────────
    if (sub === "buy") {
      const count = Math.max(1, parseInt(args[1]) || 1);
      if (isNaN(count) || count < 1) return reply("❌ Usage: .lottery buy <amount>");

      const lot     = await getLottery();
      const userId  = sender.split("@")[0];
      const myEntry = lot.tickets.find(t => t.userId === userId);
      const myCount = myEntry?.count ?? 0;

      if (myCount >= MAX_TICKETS) {
        return reply(
`╭━━━〔 🔒 𝑴𝑨𝑿 𝑻𝑰𝑪𝑲𝑬𝑻𝑺 〕━━━╮
┃ ✦ You already hold the maximum tickets!
┃
┃ 🎟️ Your Tickets › ${myCount} / ${MAX_TICKETS}
┃
┃ 💡 Use .lotterylist to see the draw.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      const canBuy = Math.min(count, MAX_TICKETS - myCount);
      const cost   = canBuy * TICKET_PRICE;
      const user   = await getUser(sender);

      if (user.money < cost) {
        return reply(
`╭━━━〔 💸 𝑰𝑵𝑺𝑼𝑭𝑭𝑰𝑪𝑰𝑬𝑵𝑻 𝑭𝑼𝑵𝑫𝑺 〕━━━╮
┃ ✦ Not enough cash for tickets!
┃
┃ 🏷️  Cost    › $${cost.toLocaleString()}
┃ 👛 Wallet  › $${user.money.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 Earn more via .work .daily .crime
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      user.money -= cost;
      await saveUser(sender, user);
      await addHistory(sender, "lottery", -cost, `Bought ${canBuy} lottery ticket(s)`);

      lot.jackpot += cost;
      if (myEntry) {
        myEntry.count += canBuy;
      } else {
        lot.tickets.push({ userId, name: user.name || "User", count: canBuy });
      }
      lot.totalTickets += canBuy;
      await saveLottery(lot);

      const newTotal = (myCount + canBuy);
      const chance   = ((newTotal / lot.totalTickets) * 100).toFixed(1);

      return reply(
`╭━━━〔 🎟️ 𝑻𝑰𝑪𝑲𝑬𝑻𝑺 𝑩𝑶𝑼𝑮𝑯𝑻 ✨ 〕━━━╮
┃ ✦ You're in the draw!
┃
┃ 🎫 Bought   › ${canBuy} ticket(s)
┃ 🎟️  Total   › ${newTotal} / ${MAX_TICKETS}
┃ 🎯 Chance  › ${chance}%
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💸 Paid    › $${cost.toLocaleString()}
┃ 👛 Wallet  › $${user.money.toLocaleString()}
┃ 💰 Jackpot › $${lot.jackpot.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🍀 Good luck!
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    // ── DRAW (owner only) ──────────────────────────────────────────────────────
    if (sub === "draw") {
      if (!isOwner && (staffLevel || 0) < 2) return reply(
`╭━━━〔 🔒 𝑨𝑪𝑪𝑬𝑺𝑺 𝑫𝑬𝑵𝑰𝑬𝑫 〕━━━╮
┃ ✦ Insufficient permissions!
┃
┃ 🎰 Drawing requires:
┃    › Owner  OR  Staff Level 2+
╰━━━━━━━━━━━━━━━━━━━━╯`
      );

      const lot = await getLottery();
      if (lot.totalTickets === 0) return reply("❌ No tickets have been bought yet.");

      // Weighted random — more tickets = higher chance
      const pool = [];
      for (const t of lot.tickets) {
        for (let i = 0; i < t.count; i++) pool.push(t);
      }

      const winner = pool[Math.floor(Math.random() * pool.length)];
      const prize  = lot.jackpot;

      // Award prize
      const winnerJid = `${winner.userId}@s.whatsapp.net`;
      const winUser   = await getUser(winnerJid);
      winUser.money   += prize;
      await saveUser(winnerJid, winUser);
      await addHistory(winnerJid, "lottery_win", prize, `Won lottery jackpot $${prize.toLocaleString()}`);

      // Reset lottery with a fresh random base jackpot
      const newBase = randomBaseJackpot();
      await getDb().collection("lottery").updateOne(
        { _id: "current" },
        { $set: { tickets: [], totalTickets: 0, jackpot: newBase, baseJackpot: newBase, createdAt: new Date() } }
      );

      return await sock.sendMessage(jid, {
        text:
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑫𝑹𝑨𝑾 🏆 〕━━━╮
┃ ✦ The winning ticket has been drawn...
┃
┃ 🏆 Winner  ➜ 『 ${winner.name} 』
┃ 🎫 Tickets ➜ 『 ${winner.count} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Jackpot Won › $${prize.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🎉 𝗖𝗢𝗡𝗚𝗥𝗔𝗧𝗨𝗟𝗔𝗧𝗜𝗢𝗡𝗦!
┃ A new lottery has started!
╰━━━━━━━━━━━━━━━━━━━━╯`,
        mentions: [winnerJid],
      }, { quoted: msg });
    }

    return reply(
`╭━━━〔 ℹ️ 𝑼𝑺𝑨𝑮𝑬 〕━━━╮
┃ .lottery info        — jackpot info
┃ .lottery buy <n>     — buy tickets
┃ .lottery draw        — draw winner
┃ .lotterylist         — all players
╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  },
};
