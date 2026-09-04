// plugins/economy/ll.js
// .ll          — show lottery pool status
// .ll draw     — owner-only: draw winner (requires ≥7 entries)
// .ll channel  — owner-only: configure the Discord announcement channel

import { getDb } from "../../lib/mongo.mjs";
import { addHistory } from "./database.js";
import {
  getLotteryAnnouncementChannel,
  setLotteryAnnouncementChannel,
} from "../../lib/lotterySettings.mjs";
import {
  drawLottery,
  findLotteryTicket,
  getDiscordParticipantId,
  REQUIRED_LOTTERY_ENTRIES,
} from "../../lib/lotteryDraw.mjs";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

const REQUIRED = REQUIRED_LOTTERY_ENTRIES;

function lotteryUserId(sender) {
  return String(sender || "").startsWith("discord:")
    ? String(sender)
    : String(sender || "").split("@")[0];
}

export default {
  name: "ll",
  description: "Lottery status or owner draw",
  category: "economy",
  usage: ".ll | .ll draw | .ll channel #channel",
  cooldown: 5,
  discordColor: "#F1C40F",
  discordTitle: "🎟️ Lottery",

  async run({ sock, msg, sender, rawSender, args, isOwner, discord }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub   = (args[0] || "").toLowerCase();
    const guildId = discord?.message?.guildId || msg.guildId || null;

    try {
      const db  = getDb();

      // ── ANNOUNCEMENT CHANNEL ──────────────────────────────────────────────
      if (sub === "channel" || sub === "announce" || sub === "announcement") {
        if (!isOwner) return reply("❌ Only the owner can configure the lottery channel.");
        if (!guildId) return reply("❌ This command must be used inside a server.");

        const selected = discord?.message?.mentions?.channels?.first?.();
        const requestedId = selected?.id || String(args[1] || "").replace(/[<#>]/g, "");
        if (!requestedId) {
          const current = await getLotteryAnnouncementChannel(guildId);
          return reply(current
            ? `🎟️ Lottery draws are announced in <#${current}>.\n\nUse *.ll channel #channel* to change it.`
            : "🎟️ No lottery announcement channel is configured.\n\nUse *.ll channel #channel* to set one.");
        }

        const channel = await discord.client.channels.fetch(requestedId).catch(() => null);
        if (!channel || channel.guildId !== guildId || !channel.isTextBased?.()) {
          return reply("❌ Choose a text channel from this server.");
        }

        const botMember = channel.guild?.members?.me
          || channel.guild?.members?.cache?.get(discord.client.user?.id);
        if (botMember && !channel.permissionsFor(botMember)?.has("SendMessages")) {
          return reply("❌ I cannot send messages in that channel.");
        }

        await setLotteryAnnouncementChannel(guildId, channel.id);
        return reply(`✅ Lottery draw announcements will be posted in <#${channel.id}>.`);
      }

      const lot = await db.collection("lottery").findOne({ _id: "current" });

      // ── DRAW ──────────────────────────────────────────────────────────────
      if (sub === "draw") {
        if (!isOwner) return reply("❌ Only the owner can draw the lottery.");
        if (!lot || !lot.tickets?.length) return reply("❌ No active lottery.");

        const totalTickets = lot.totalTickets || 0;
        if (totalTickets < REQUIRED) {
          return reply(`❌ Need at least ${REQUIRED} total tickets to draw.\nCurrent: ${totalTickets}`);
        }

        const announcementChannelId = guildId
          ? await getLotteryAnnouncementChannel(guildId)
          : null;
        const result = await drawLottery({
          db,
          minimumEntries: REQUIRED,
          guildId,
          announcementChannelId,
          discord,
        });
        if (!result.ok) return reply("❌ The lottery could not be drawn.");
        await sock.sendMessage(jid, result.message, { quoted: msg });
        if (announcementChannelId && String(announcementChannelId) !== String(jid)) {
          await sock.sendMessage(announcementChannelId, result.message).catch((error) => {
            console.error("[lottery] Failed to post configured announcement:", error.message);
          });
        }
        return;
      }

      // ── STATUS (poll-style) ───────────────────────────────────────────────
      const tickets = lot?.tickets || [];
      const totalEntries = lot?.totalTickets || 0;

      try {
        if (discord) throw new Error("Discord uses the embed status fallback.");
        const pollMsg = generateWAMessageFromContent(
          jid,
          proto.Message.fromObject({
            pollResultSnapshotMessage:
              proto.Message.PollResultSnapshotMessage.fromObject({
                name: `🎟️ Lottery Pool — ${REQUIRED} entries required to draw`,
                pollVotes: [
                  { optionName: "🔒 Required entries", optionVoteCount: REQUIRED },
                  { optionName: "🎫 Current entries",  optionVoteCount: totalEntries },
                ],
              }),
          }),
          { quoted: msg }
        );
        await sock.relayMessage(jid, pollMsg.message, { messageId: pollMsg.key.id });
      } catch (_) {
        // Fallback to plain text if poll fails
        const jackpot = lot?.jackpot ?? 0;
        const myCount = findLotteryTicket(
          tickets,
          lotteryUserId(sender),
          getDiscordParticipantId(discord, rawSender),
        )?.count ?? 0;
        await reply(
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑺𝑻𝑨𝑻𝑼𝑺 〕━━━╮
┃ 💰 Jackpot     › $${jackpot.toLocaleString()}
┃ 🎫 Entries     › ${totalEntries} / ${REQUIRED} required
┃ 🎟️  Your tickets › ${myCount}
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 .lottery buy <n> to join
┃ 💡 .lottery draw — draw winner (owner)
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

    } catch (err) {
      console.error("LL ERROR:", err);
      return sock.sendMessage(jid, { text: "❌ Lottery error: " + err.message }, { quoted: msg });
    }
  },
};
