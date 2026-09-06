/**
 * .lottery       — buy one lottery ticket ($500; one ticket per player)
 * .lottery draw — owner-only: draw the winning tickets
 */
import { getUser, saveUser, requireRegistration, addHistory, getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";
import { getLotteryAnnouncementChannel } from "../../lib/lotterySettings.mjs";
import {
  drawLottery,
  findLotteryTicket,
  getDiscordParticipantId,
  lotteryDisplayName,
  REQUIRED_LOTTERY_ENTRIES,
} from "../../lib/lotteryDraw.mjs";

const TICKET_PRICE  = 500;
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
  description: "Buy one lottery ticket or draw the jackpot",
  usage: ".lottery  |  .lottery draw",
  discordColor: "#F1C40F",
  discordTitle: "🎰 Lottery",

  async run({ sock, msg, sender, rawSender, args, isOwner, staffLevel, discord }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid  = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub = (args[0] || "ticket").toLowerCase();

    if (sub === "ticket") {
      if (args.length > 0) {
        return reply("❌ Use `.lottery` to buy your one ticket. `.lottery draw` is owner-only.");
      }
      const count = 1;

      const lot     = await getLottery();
      const userId  = sender.startsWith("discord:")
        ? sender
        : sender.split("@")[0];
      const discordId = getDiscordParticipantId(discord, rawSender);
      const myEntry = findLotteryTicket(lot.tickets, userId, discordId);
      const myCount = myEntry?.count ?? 0;

      if (myCount >= MAX_TICKETS) {
        return reply(
`╭━━━〔 🔒 𝑴𝑨𝑿 𝑻𝑰𝑪𝑲𝑬𝑻𝑺 〕━━━╮
┃ ✦ You already hold the maximum tickets!
┃
┃ 🎟️ Your Ticket › already purchased
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
        if (discordId) myEntry.discordId = discordId;
        if (discord?.message) myEntry.name = lotteryDisplayName({
          name: discord.message.member?.displayName
            || discord.message.author?.globalName
            || discord.message.author?.username
            || myEntry.name,
        });
      } else {
        lot.tickets.push({
          userId,
          discordId: discordId || undefined,
          name: discord?.message?.member?.displayName
            || discord?.message?.author?.globalName
            || discord?.message?.author?.username
            || user.name
            || "User",
          count: canBuy,
        });
      }
      lot.totalTickets += canBuy;
      await saveLottery(lot);

      const newTotal = (myCount + canBuy);
      const chance   = ((newTotal / lot.totalTickets) * 100).toFixed(1);

      await reply(
`╭━━━〔 🎟️ 𝑻𝑰𝑪𝑲𝑬𝑻𝑺 𝑩𝑶𝑼𝑮𝑯𝑻 ✨ 〕━━━╮
┃ ✦ You're in the draw!
┃
┃ 🎫 Ticket   › purchased
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

      if (lot.totalTickets >= REQUIRED_LOTTERY_ENTRIES) {
        const guildId = discord?.message?.guildId || msg.guildId || null;
        const configuredChannel = guildId
          ? await getLotteryAnnouncementChannel(guildId)
          : null;
        const result = await drawLottery({
          db: getDb(),
          minimumEntries: REQUIRED_LOTTERY_ENTRIES,
          guildId,
          announcementChannelId: configuredChannel,
          discord,
        });
        if (result.ok) {
          await sock.sendMessage(jid, result.message);
          if (configuredChannel && String(configuredChannel) !== String(jid)) {
            await sock.sendMessage(configuredChannel, result.message).catch((error) => {
              console.error("[lottery] Failed to post configured announcement:", error.message);
            });
          }
        }
      }
      return;
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

      const guildId = discord?.message?.guildId || msg.guildId || null;
      const announcementChannelId = guildId
        ? await getLotteryAnnouncementChannel(guildId)
        : null;
      const result = await drawLottery({
        db: getDb(),
        minimumEntries: REQUIRED_LOTTERY_ENTRIES,
        guildId,
        announcementChannelId,
        discord,
      });
      if (!result.ok) {
        return reply(result.reason === "empty"
          ? "❌ No tickets have been bought yet."
          : "❌ The lottery could not be drawn.");
      }
      await sock.sendMessage(jid, result.message, { quoted: msg });
      if (announcementChannelId && String(announcementChannelId) !== String(jid)) {
        await sock.sendMessage(announcementChannelId, result.message).catch((error) => {
          console.error("[lottery] Failed to post configured announcement:", error.message);
        });
      }
      return;
    }

    return reply(
`╭━━━〔 ℹ️ 𝑼𝑺𝑨𝑮𝑬 〕━━━╮
┃ .lottery       — buy one ticket
┃ .lottery draw — draw winners (owner)
┃ .lotterylist   — see all players
╰━━━━━━━━━━━━━━━━━━━━╯`
    );
  },
};
