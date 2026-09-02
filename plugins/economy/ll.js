// plugins/economy/ll.js
// .ll          — show lottery pool status; auto-draws at 7 entries
// .ll draw     — owner-only: draw the three configured prizes

import { getDb } from "../../lib/mongo.mjs";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";
import {
  formatLotteryResults,
  LOTTERY_MAX_ENTRIES,
  maybeAutoDraw,
} from "../../lib/lotteryAutoDraw.mjs";

const REQUIRED = LOTTERY_MAX_ENTRIES;

export default {
  name: "ll",
  description: "Lottery status with automatic three-winner draw",
  category: "economy",
  usage: ".ll | .ll draw",
  cooldown: 5,

  async run({ sock, msg, sender, args, isOwner }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub   = (args[0] || "").toLowerCase();

    try {
      const db  = getDb();
      const lot = await db.collection("lottery").findOne({ _id: "current" });

      // ── DRAW ──────────────────────────────────────────────────────────────
      if (sub === "draw") {
        if (!isOwner) return reply("❌ Only the owner can draw the lottery.");
        if (!lot || !lot.tickets?.length) return reply("❌ No active lottery.");

        const totalTickets = lot.totalTickets || 0;
        if (totalTickets < REQUIRED) {
          return reply(`❌ Need at least ${REQUIRED} total tickets to draw.\nCurrent: ${totalTickets}`);
        }

        const result = await maybeAutoDraw();
        if (!result) return reply("❌ The lottery draw is already in progress.");
        return sock.sendMessage(jid, formatLotteryResults(result), { quoted: msg });
      }

      // ── STATUS (poll-style) ───────────────────────────────────────────────
      const automaticDraw = await maybeAutoDraw();
      if (automaticDraw) {
        return sock.sendMessage(jid, formatLotteryResults(automaticDraw), { quoted: msg });
      }

      const tickets = lot?.tickets || [];
      const totalEntries = lot?.totalTickets || 0;

      try {
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
        const myCount = tickets.find(t => t.userId === sender.split("@")[0])?.count ?? 0;
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
