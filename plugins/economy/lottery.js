/**
 * .lottery  — enter the global lottery ($10,000, one ticket per round)
 * .lottery draw           — owner/staff: draw three prizes after 15 entries
 * .lottery info           — show jackpot + your tickets
 * The round auto-draws three prizes when it reaches fifteen total tickets.
 */
import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";
import {
  formatLotteryResults,
  findLotteryTicket,
  getWhatsAppParticipantId,
  LOTTERY_MAX_ENTRIES,
  maybeAutoDraw,
  queueLotteryAnnouncement,
} from "../../lib/lotteryAutoDraw.mjs";

const mentionFor = (userId) => `@${String(userId).split("@")[0]}`;

const TICKET_PRICE  = 10_000;
const MAX_TICKETS   = 1;
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
  const tickets = Array.isArray(doc.tickets) ? doc.tickets : [];
  const totalTickets = Number.isFinite(Number(doc.totalTickets))
    ? Number(doc.totalTickets)
    : tickets.reduce((total, ticket) => total + (Number(ticket.count) || 0), 0);
  return {
    ...doc,
    tickets,
    totalTickets,
    jackpot: Number.isFinite(Number(doc.jackpot)) ? Number(doc.jackpot) : 0,
  };
}


async function announceLotteryDraw({ sock, jid, msg, result }) {
  const content = formatLotteryResults(result);
  await sock.sendMessage(jid, content, { quoted: msg });
  const groupId = String(jid || "").endsWith("@g.us") ? String(jid) : result.whatsappGroupId;
  if (groupId && String(groupId) !== String(jid)) {
    await sock.sendMessage(groupId, content).catch((error) => {
      console.error("[lottery] Failed to post WhatsApp group results:", error?.message || error);
    });
  }
  await queueLotteryAnnouncement({ db: getDb(), result, sourcePlatform: "whatsapp", whatsappGroupId: groupId });
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
  usage: ".lottery  |  .lottery info  |  .lottery draw",

  async run({ sock, msg, sender, args, isOwner, staffLevel }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub  = (args[0] || "buy").toLowerCase();

    // ── INFO ───────────────────────────────────────────────────────────────────
    if (sub === "info") {
      const lot      = await getLottery();
      const myCount  = findLotteryTicket(lot.tickets, sender)?.count ?? 0;
      const chance   = lot.totalTickets > 0 ? ((myCount / lot.totalTickets) * 100).toFixed(1) : "0.0";
      return reply(
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑰𝑵𝑭𝑶 🎟️ 〕━━━╮
┃ ✦ Try your luck — win big!
┃
┃ 💰 Jackpot      › $${lot.jackpot.toLocaleString()}
┃ 🎫 Total Tickets › ${lot.totalTickets} / ${LOTTERY_MAX_ENTRIES}
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
      const requestedCount = args[1] ? parseInt(args[1], 10) : 1;
      if (!Number.isFinite(requestedCount) || requestedCount < 1) return reply("❌ Use `.lottery` to buy one ticket.");
      if (requestedCount > 1) return reply("🎟️ You can only buy one ticket for the global lottery.");

      const lot     = await getLottery();
      if (lot.totalTickets >= LOTTERY_MAX_ENTRIES) {
        const automaticDraw = await maybeAutoDraw();
        if (automaticDraw) {
          await announceLotteryDraw({ sock, jid, msg, result: automaticDraw });
          return;
        }
      }

      const userId = sender.startsWith("discord:")
        ? sender
        : getWhatsAppParticipantId(sender) || sender;
      const myEntry = findLotteryTicket(lot.tickets, sender);
      const myCount = myEntry?.count ?? 0;

      if (myCount >= MAX_TICKETS) {
        return reply("⚠️ You have already entered the global lottery.");
      }

      const availableEntries = Math.max(0, LOTTERY_MAX_ENTRIES - lot.totalTickets);
      const canBuy = Math.min(requestedCount, MAX_TICKETS - myCount, availableEntries);
      if (canBuy < 1) {
        return reply("⏳ The lottery is drawing now. Please try again in a moment.");
      }
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
        myEntry.userId = userId;
        if (jid.endsWith("@g.us")) myEntry.groupId = jid;
      } else {
        lot.tickets.push({ userId, name: user.name || "User", count: canBuy, ...(jid.endsWith("@g.us") ? { groupId: jid } : {}) });
      }
      lot.totalTickets += canBuy;
      await saveLottery(lot);

      const newTotal = (myCount + canBuy);
      const chance   = ((newTotal / lot.totalTickets) * 100).toFixed(1);

      if (lot.totalTickets >= LOTTERY_MAX_ENTRIES) {
        const automaticDraw = await maybeAutoDraw();
        if (automaticDraw) {
          await announceLotteryDraw({ sock, jid, msg, result: automaticDraw });
          return;
        }
      }

      return reply(
        `✅ You have entered the global lottery.\n🎟️ One ticket purchased for $${cost.toLocaleString()}.\n💰 Wallet remaining: $${user.money.toLocaleString()}\n🍀 Good luck!`,
      );
    }

    // ── DRAW (owner only) ──────────────────────────────────────────────────────
    if (sub === "draw") {
      if (!isOwner && (staffLevel || 0) < 2) return reply(
"╭━━━〔 🔒 𝑨𝑪𝑪𝑬𝑺𝑺 𝑫𝑬𝑵𝑰𝑬𝑫 〕━━━╮\n┃ ✦ Insufficient permissions!\n┃\n┃ 🎰 Drawing requires:\n┃    › Owner  OR  Staff Level 2+\n╰━━━━━━━━━━━━━━━━━━━━╯"
      );

      const lot = await getLottery();
      if (lot.totalTickets === 0) return reply("❌ No tickets have been bought yet.");
      if (lot.totalTickets < LOTTERY_MAX_ENTRIES) {
        return reply("❌ Need at least " + LOTTERY_MAX_ENTRIES + " participants to draw. Current: " + lot.totalTickets);
      }

      const result = await maybeAutoDraw();
      if (!result) return reply("⏳ The lottery draw is already in progress. Please try again shortly.");
      await announceLotteryDraw({ sock, jid, msg, result });
      return;
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
