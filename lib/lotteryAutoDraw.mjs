import { getDb } from "./mongo.mjs";
import { addHistory, getUser, saveUser } from "../plugins/economy/database.js";

export const LOTTERY_MAX_ENTRIES = 7;
export const LOTTERY_PRIZES = [200_000, 120_000, 70_000];

let drawInFlight = null;

function asJid(userId) {
  const value = String(userId || "");
  return value.includes("@") ? value : `${value}@s.whatsapp.net`;
}

function ticketPool(tickets) {
  const pool = [];
  for (const ticket of tickets) {
    const count = Math.max(0, Number(ticket.count) || 0);
    for (let index = 0; index < count; index += 1) pool.push(ticket);
  }
  return pool;
}

function pickWeighted(pool) {
  if (!pool.length) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function chooseWinners(tickets) {
  const original = tickets.filter((ticket) => (Number(ticket.count) || 0) > 0);
  let remaining = [...original];
  const winners = [];

  for (const prize of LOTTERY_PRIZES) {
    const pool = ticketPool(remaining);
    if (!pool.length) break;

    const winner = pickWeighted(pool);
    winners.push({ ...winner, prize });

    // Prefer different winners. If there are fewer than three participants,
    // restart the pool so every configured prize still gets awarded.
    const hasAnotherParticipant = remaining.some(
      (ticket) => ticket.userId !== winner.userId,
    );
    remaining = hasAnotherParticipant
      ? remaining.filter((ticket) => ticket.userId !== winner.userId)
      : [...original];
  }

  return winners;
}

export function formatLotteryResults(result) {
  const mentions = result.winners.map((winner) => asJid(winner.userId));
  const rows = result.winners
    .map((winner) => `@${String(winner.userId).replace(/@.*$/, "")} — $${winner.prize}`)
    .join("\n");

  return {
    text: `🎟️ *Lottery Results*\n\n${rows}`,
    mentions,
  };
}

async function drawIfReady() {
  const db = getDb();
  const collection = db.collection("lottery");
  const lot = await collection.findOne({ _id: "current" });
  const totalEntries = Number(lot?.totalTickets) || 0;

  if (!lot?.tickets?.length || totalEntries < LOTTERY_MAX_ENTRIES) {
    return null;
  }

  const winners = chooseWinners(lot.tickets);
  if (!winners.length) return null;

  for (const winner of winners) {
    const winnerJid = asJid(winner.userId);
    const user = await getUser(winnerJid);
    user.money = (Number(user.money) || 0) + winner.prize;
    await saveUser(winnerJid, user);
    await addHistory(
      winnerJid,
      "lottery_win",
      winner.prize,
      `Won lottery prize $${winner.prize}`,
    );
  }

  const newBase = Math.floor(Math.random() * (50_000_000 - 10_000_000 + 1)) + 10_000_000;
  await collection.updateOne(
    { _id: "current" },
    {
      $set: {
        tickets: [],
        totalTickets: 0,
        jackpot: newBase,
        baseJackpot: newBase,
        createdAt: new Date(),
      },
    },
  );

  return { winners, totalEntries };
}

export async function maybeAutoDraw() {
  if (!drawInFlight) {
    drawInFlight = drawIfReady().finally(() => {
      drawInFlight = null;
    });
  }
  return drawInFlight;
}
