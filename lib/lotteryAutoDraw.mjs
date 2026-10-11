import { randomUUID } from "node:crypto";
import { addHistory } from "../plugins/economy/database.js";
import { getDb } from "./mongo.mjs";
import {
  lotteryDisplayName,
  lotteryWinnerIdentity,
  lotteryWinnerLabel,
  sanitizeLotteryDisplayName,
} from "./lotteryIdentity.mjs";

export {
  asJid,
  findLotteryTicket,
  getWhatsAppParticipantId,
  lotteryDisplayName,
  lotteryWinnerIdentity,
  lotteryWinnerLabel,
  sanitizeLotteryDisplayName,
} from "./lotteryIdentity.mjs";

export const REQUIRED_LOTTERY_ENTRIES = 15;
export const LOTTERY_MAX_ENTRIES = REQUIRED_LOTTERY_ENTRIES;
export const LOTTERY_PRIZES = [30_000_000, 20_000_000, 10_000_000];

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

  const whatsappGroupId = [...lot.tickets].reverse().map((ticket) => String(ticket.groupId || ticket.whatsappGroupId || "")).find((id) => id.endsWith("@g.us")) || null;
  const awarded = [];

  for (let index = 0; index < winners.length; index += 1) {
    const winner = winners[index];
    const amount = LOTTERY_PRIZES[index];
    const identity = lotteryWinnerIdentity(winner);
    if (!identity) continue;

    const profile = await db.collection("users").findOne(
      { _id: identity },
      { projection: { name: 1, username: 1 } },
    );
    const currentName = sanitizeLotteryDisplayName(profile?.name || profile?.username);
    if (currentName) winner.name = currentName;

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

    awarded.push({ ...winner, amount, identity, ...(identity.endsWith("@s.whatsapp.net") ? { jid: identity } : {}) });
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
    return "┃ " + medal + " " + lotteryWinnerLabel(winner) + " — $" + winner.amount.toLocaleString();
  });

  const mentions = awarded
    .map((winner) => lotteryWinnerIdentity(winner))
    .filter((identity) => identity.endsWith("@s.whatsapp.net"));

  return {
    ok: true,
    prize: LOTTERY_PRIZES.reduce((sum, amount) => sum + amount, 0),
    winners: awarded,
    mentions,
    totalTickets,
    whatsappGroupId,
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


export async function queueLotteryAnnouncement({ db, result, sourcePlatform, whatsappGroupId = null }) {
  if (!db || !result?.ok || !Array.isArray(result.winners)) return null;
  const source = sourcePlatform === "discord" ? "discord" : "whatsapp";
  const suppliedGroup = String(whatsappGroupId || "");
  const requestedGroup = suppliedGroup.endsWith("@g.us") ? suppliedGroup : String(result.whatsappGroupId || "");
  const targetGroup = requestedGroup.endsWith("@g.us") ? requestedGroup : null;
  const winners = result.winners.map((winner) => {
    const identity = lotteryWinnerIdentity(winner);
    const rawId = String(winner.userId || "");
    const discordId = String(winner.discordId || (rawId.startsWith("discord:") ? rawId.slice("discord:".length) : "")) || null;
    const phone = identity.endsWith("@s.whatsapp.net") ? identity.split("@")[0] : null;
    return {
      userId: rawId,
      name: lotteryDisplayName(winner),
      amount: Number(winner.amount || 0),
      discordId,
      phone,
    };
  });
  const whatsappMentions = result.winners
    .map((winner) => lotteryWinnerIdentity(winner))
    .filter((identity) => identity.endsWith("@s.whatsapp.net"));
  const event = {
    _id: randomUUID(),
    type: "lottery_draw",
    sourcePlatform: source,
    createdAt: new Date(),
    whatsappGroupId: targetGroup,
    payload: {
      text: String(result.message?.text || ""),
      mentions: whatsappMentions,
      totalTickets: Number(result.totalTickets || 0),
      prize: Number(result.prize || 0),
      winners,
    },
    deliveries: {
      whatsapp: source === "whatsapp"
        ? { status: "sent", sentAt: new Date() }
        : targetGroup ? { status: "pending", attempts: 0 } : { status: "skipped", reason: "No WhatsApp group is recorded for this round." },
      discord: source === "discord"
        ? { status: "sent", sentAt: new Date() }
        : { status: "pending", attempts: 0 },
    },
  };
  try {
    await db.collection("lottery_announcements").insertOne(event);
    return event._id;
  } catch (error) {
    console.error("[lottery] Could not queue cross-platform results:", error?.message || error);
    return null;
  }
}
