/**
 * .lottery buy [tickets]  — buy lottery tickets ($500 each, max 10 per person)
 * .lottery draw           — owner-only: draw the winning ticket
 * .lottery info           — show jackpot + your tickets
 */
import { getUser, saveUser, requireRegistration, addHistory, getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const TICKET_PRICE = 500;
const MAX_TICKETS  = 10;

async function getLottery() {
  const db  = getDb();
  let doc   = await db.collection("lottery").findOne({ _id: "current" });
  if (!doc) {
    doc = { _id: "current", tickets: [], totalTickets: 0, jackpot: 0, createdAt: new Date() };
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
  description: "Buy lottery tickets or draw the jackpot",
  usage: ".lottery buy [amount]  |  .lottery draw  |  .lottery info",

  async run({ sock, msg, sender, args, isOwner, isMod }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub  = (args[0] || "info").toLowerCase();

    // ── INFO ───────────────────────────────────────────────────────────────────
    if (sub === "info") {
      const lot  = await getLottery();
      const mine = lot.tickets.filter(t => t.userId === sender.split("@")[0]);
      return reply(
`🎰 *LOTTERY INFO*

💰 Jackpot         : $${lot.jackpot.toLocaleString()}
🎫 Total Tickets   : ${lot.totalTickets}
🎟️  Your Tickets   : ${mine.reduce((s, t) => s + t.count, 0)}

Ticket Price : $${TICKET_PRICE} each
Max per user : ${MAX_TICKETS} tickets

*Buy:* .lottery buy <amount>
*List:* .lotterylist`
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
        return reply(`❌ You already have ${myCount} tickets (max ${MAX_TICKETS}).`);
      }

      const canBuy = Math.min(count, MAX_TICKETS - myCount);
      const cost   = canBuy * TICKET_PRICE;
      const user   = await getUser(sender);

      if (user.money < cost) {
        return reply(`❌ Not enough cash!\n\n💸 Costs : $${cost.toLocaleString()}\n💵 Have  : $${user.money.toLocaleString()}`);
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

      return reply(
`🎟️ *Lottery Tickets Bought!*

🎫 Bought  : ${canBuy} ticket(s)
💸 Paid    : $${cost.toLocaleString()}
💵 Balance : $${user.money.toLocaleString()}
💰 Jackpot : $${lot.jackpot.toLocaleString()}`
      );
    }

    // ── DRAW (owner only) ──────────────────────────────────────────────────────
    if (sub === "draw") {
      if (!isOwner && !isMod) return reply("❌ Only the owner or a mod/staff can draw the lottery.");

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

      // Reset lottery
      await getDb().collection("lottery").updateOne(
        { _id: "current" },
        { $set: { tickets: [], totalTickets: 0, jackpot: 0, createdAt: new Date() } }
      );

      return await sock.sendMessage(jid, {
        text:
`🎰 *LOTTERY DRAW RESULTS*

🏆 WINNER: ${winner.name}
🎫 Tickets: ${winner.count}
💰 JACKPOT WON: $${prize.toLocaleString()}

🎉 Congratulations! New lottery has started.`,
        mentions: [winnerJid],
      }, { quoted: msg });
    }

    return reply("❌ Usage: .lottery buy <n>  |  .lottery info  |  .lottery draw (owner)");
  },
};
