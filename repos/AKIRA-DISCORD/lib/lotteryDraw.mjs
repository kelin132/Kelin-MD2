import { addHistory } from "../plugins/economy/database.js";

export const REQUIRED_LOTTERY_ENTRIES = 7;

function discordIdFrom(value) {
  const raw = String(value || "");
  if (raw.startsWith("discord:")) return raw.slice("discord:".length);
  return /^\d{5,}$/.test(raw) ? raw : null;
}

export function getDiscordParticipantId(discord, rawSender) {
  return discord?.message?.author?.id
    || discordIdFrom(rawSender)
    || null;
}

export function lotteryTicketDiscordId(ticket) {
  if (ticket?.discordId) return discordIdFrom(ticket.discordId);
  const userId = String(ticket?.userId || "");
  return userId.startsWith("discord:") ? discordIdFrom(userId) : null;
}

export function findLotteryTicket(tickets, sender, discordId) {
  return tickets.find((ticket) =>
    String(ticket.userId) === String(sender)
    || (discordId && String(ticket.discordId || "") === String(discordId))
    || (discordId && String(ticket.userId) === `discord:${discordId}`),
  );
}

export function lotteryDisplayName(ticket) {
  return String(ticket?.name || "Lottery player").trim() || "Lottery player";
}

export async function resolveDiscordDisplayName(discord, ticket) {
  const discordId = lotteryTicketDiscordId(ticket);
  if (!discordId || !discord?.client) return "";

  const guild = discord.message?.guild;
  if (guild?.members?.fetch) {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (member?.displayName) return String(member.displayName).trim();
  }

  const user = await discord.client.users.fetch(discordId).catch(() => null);
  return String(user?.globalName || user?.username || "").trim();
}

function weightedWinners(tickets, count = 3) {
  const candidates = tickets
    .filter((ticket) => Number(ticket.count) > 0)
    .map((ticket) => ({ ticket, weight: Number(ticket.count) }));
  const winners = [];

  while (candidates.length && winners.length < count) {
    const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedIndex = candidates.length - 1;

    for (let index = 0; index < candidates.length; index += 1) {
      roll -= candidates[index].weight;
      if (roll < 0) {
        selectedIndex = index;
        break;
      }
    }

    winners.push(candidates.splice(selectedIndex, 1)[0].ticket);
  }

  return winners;
}

export function lotteryWinnerIdentity(ticket) {
  const identity = String(ticket?.userId || "").trim();
  if (!identity) return "";
  if (identity.startsWith("discord:") || identity.includes("@")) return identity;
  return `${identity}@s.whatsapp.net`;
}

function prizeShares(prize, winnerCount) {
  const base = Math.floor(prize / winnerCount);
  const remainder = prize - (base * winnerCount);
  return winners => base + (winners < remainder ? 1 : 0);
}

export async function drawLottery({
  db,
  minimumEntries = 1,
  guildId = null,
  announcementChannelId = null,
  discord = null,
}) {
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

  if (discord) {
    for (const winner of winners) {
      const displayName = await resolveDiscordDisplayName(discord, winner);
      if (displayName) winner.name = displayName;
    }
  }

  const prize = Number(lot.jackpot || 0);
  const shareFor = prizeShares(prize, winners.length);
  const awarded = [];

  for (let index = 0; index < winners.length; index += 1) {
    const winner = winners[index];
    const amount = shareFor(index);
    const identity = lotteryWinnerIdentity(winner);
    if (!identity) continue;

    await db.collection("users").updateOne(
      { _id: identity },
      {
        $inc: { money: amount },
        $setOnInsert: { name: lotteryDisplayName(winner), registered: true },
      },
      { upsert: true },
    );
    await addHistory(
      identity,
      "lottery_win",
      amount,
      `Won lottery prize $${amount.toLocaleString()} (${index + 1}/${winners.length})`,
    );
    awarded.push({ ...winner, amount });
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
    },
  );

  const winnerLines = awarded.map((winner, index) => {
    const medal = ["🥇", "🥈", "🥉"][index] || "🏆";
    return `┃ ${medal} ${lotteryDisplayName(winner)}`;
  });
  const mentions = awarded
    .map(lotteryTicketDiscordId)
    .filter(Boolean)
    .map((id) => `discord:${id}`);

  return {
    ok: true,
    prize,
    winners: awarded,
    mentions,
    guildId,
    announcementChannelId,
    message: {
      text:
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑫𝑹𝑨𝑾 🏆 〕━━━╮
┃ ✦ The winning tickets have been drawn...
┃
${winnerLines.join("\n")}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Jackpot split › $${prize.toLocaleString()}
┃ 🎫 Entries       › ${totalTickets}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🎉 𝗖𝗢𝗡𝗚𝗥𝗔𝗧𝗨𝗟𝗔𝗧𝗜𝗢𝗡𝗦!
┃ A new lottery has started!
╰━━━━━━━━━━━━━━━━━━━━╯`,
      mentions,
    },
  };
}