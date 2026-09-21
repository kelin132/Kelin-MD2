import { addHistory } from "../plugins/economy/database.js";
import { getDb } from "./mongo.mjs";

export const REQUIRED_LOTTERY_ENTRIES = 7;
export const LOTTERY_MAX_ENTRIES = REQUIRED_LOTTERY_ENTRIES;
export const LOTTERY_PRIZES = [30_000_000, 20_000_000, 10_000_000];

export function getWhatsAppParticipantId(rawSender) {
  const raw = String(rawSender || "").trim();
  if (!raw) return null;
  if (raw.endsWith("@s.whatsapp.net")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : null;
}

// Export asJid to resolve the plugin load warnings
export const asJid = getWhatsAppParticipantId;

export function findLotteryTicket(tickets, sender) {
  const jid = getWhatsAppParticipantId(sender);
  return tickets.find((ticket) => 
    String(ticket.userId) === String(sender) || 
    (jid && String(ticket.userId) === jid)
  );
}

export function lotteryDisplayName(ticket) {
  return String(ticket?.name || ticket?.userId || "Lottery player").trim() || "Lottery player";
}

export function lotteryWinnerIdentity(ticket) {
  return getWhatsAppParticipantId(ticket?.userId) || "";
}

function weightedWinners(tickets, count = LOTTERY_PRIZES.length) {
  const candidates = tickets.filter((ticket) => Number(ticket.count) > 0);
  const weighted = candidates.map((ticket) => ({ ticket, weight: Number(ticket.count) }));
  const winners = [];

  while (weighted.length && winners.length < count) {
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedIndex = weighted.length - 1;

    for (let index = 0; index < weighted.length; index += 1) {
      roll -= weighted[index].weight;
      if (roll < 0) {
        selectedIndex = index;
        break;
      }
    }

    const selected = weighted.splice(selectedIndex, 1)[0].ticket;
    winners.push(selected);
  }

  return winners;
}

export async function drawLottery({ db, minimumEntries = 1 }) {
  const lot = await db.collection("lottery").findOne({ _id: "current" });
  const totalTickets = Number(lot?.totalTickets || 0);

  if (!lot || !lot.tickets?.length) {
    return { ok: false, reason: "empty" };
  }
  if (totalTickets < minimumEntries) {
    return { ok: false, reason: "minimum", totalTickets, minimumEntries };
  }

  const winners = weightedWinners(lot.tickets, 3).map((winner) => ({ ...winner }));
  if (!winners.length) return { ok: false, reason: "empty" };

  const awarded = [];

  for (let index = 0; index < winners.length; index += 1) {
    const winner = winners[index];
    const amount = LOTTERY_PRIZES[index];
    const identity = lotteryWinnerIdentity(winner);
    if (!identity) continue;

    await db.collection("users").updateOne(
      { _id: identity },
      {
        $inc: { money: amount },$setOnInsert: { name: lotteryDisplayName(winner), registered: true },
      },
      { upsert: true }
    );

    await addHistory(
      identity,
      "lottery_win",
      amount,
      `Won lottery prize $${amount.toLocaleString()} (${index + 1}/${LOTTERY_PRIZES.length})`
    );

    awarded.push({ ...winner, amount, jid: identity });
  }

  const newBase = Math.floor(Math.random() * (50_000_000 - 10_000_000 + 1)) + 10_000_000;
  await db.collection("lottery").updateOne(
    { _id: "current" },
    {
      $set: {
        tickets: [],
        totalTickets: 0,
        jackpot: newBase,
        baseJackpot: newBase,
        createdAt: new Date(),
      },
    }
  );

  const winnerLines = awarded.map((winner, index) => {
    const medal = ["🥇", "🥈", "🥉"][index] || "🏆";
    return `┃ ${medal} @${winner.jid.split("@")[0]} — $${winner.amount.toLocaleString()}`;
  });

  const mentions = awarded.map((winner) => winner.jid).filter(Boolean);

  return {
    ok: true,
    prize: LOTTERY_PRIZES.reduce((sum, amount) => sum + amount, 0),
    winners: awarded,
    mentions,
    message: {
      text: 
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑫𝑹𝑨𝑾 🏆 〕━━━╮
┃ ✦ The winning tickets have been drawn...
┃
${winnerLines.join("\n")}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Prizes paid   › $${LOTTERY_PRIZES.reduce((sum, amount) => sum + amount, 0).toLocaleString()}
┃ 🎫 Entries       › ${totalTickets}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🎉 𝗖𝗢𝗡𝗚𝗥𝗔𝗧𝗨𝗟𝗔𝗧𝗜𝗢𝗡𝗦!
┃ A new lottery has started!
╰━━━━━━━━━━━━━━━━━━━━╯`,
      mentions,
    },
  };
}

export async function maybeAutoDraw({ minimumEntries = LOTTERY_MAX_ENTRIES } = {}) {
  const result = await drawLottery({
    db: getDb(),
    minimumEntries,
  });
  return result.ok ? result : null;
}

export function formatLotteryResults(result) {
  return result?.message ?? {
    text: "❌ The lottery draw could not be completed.",
    mentions: [],
  };
}
