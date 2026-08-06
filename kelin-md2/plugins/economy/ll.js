// plugins/economy/ll.js
// .ll          — show lottery pool status
// .ll draw     — owner-only: draw winner (requires ≥7 entries)

import { getDb } from "../../lib/mongo.mjs";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

const REQUIRED = 7; // minimum total tickets before a draw can happen

export default {
  name: "ll",
  description: "Lottery status or owner draw",
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

        // Build weighted pool
        const pool = [];
        for (const t of lot.tickets) {
          for (let i = 0; i < (t.count || 0); i++) pool.push(t);
        }

        const winner = pool[Math.floor(Math.random() * pool.length)];
        const prize  = lot.jackpot || 0;

        // Award prize
        const winnerJid = `${winner.userId}@s.whatsapp.net`;
        await db.collection("economy_users").updateOne(
          { jid: winnerJid },
          { $inc: { money: prize } }
        );

        // Reset lottery with a fresh jackpot
        const newBase = Math.floor(Math.random() * (50_000_000 - 10_000_000 + 1)) + 10_000_000;
        await db.collection("lottery").updateOne(
          { _id: "current" },
          { $set: { tickets: [], totalTickets: 0, jackpot: newBase, baseJackpot: newBase, createdAt: new Date() } }
        );

        return sock.sendMessage(jid, {
          text:
`╭━━━〔 🎰 𝑳𝑶𝑻𝑻𝑬𝑹𝒀 𝑫𝑹𝑨𝑾 🏆 〕━━━╮
┃ ✦ The winning ticket has been drawn...
┃
┃ 🏆 Winner  ➜ 『 @${winner.userId} 』
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

      // ── STATUS (poll-style) ───────────────────────────────────────────────
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
