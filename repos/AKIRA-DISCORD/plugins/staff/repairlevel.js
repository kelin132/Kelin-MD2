/**
 * .repairlevel [@user | all]
 * Recalculates and restores correct levels for players whose levels were
 * reset to 1 by the old broken XP formula.
 *
 * Usage:
 *   .repairlevel @user   — repair one player
 *   .repairlevel all     — repair every registered player (owner only)
 */
import { repairUserLevel, repairAllLevels } from "../economy/database.js";

export default {
  name: "repairlevel",
  aliases: ["fixlevel", "fixlevels", "repairlevels"],
  description: "Recalculate and restore correct levels for affected players",
  category: "staff",
  usage: ".repairlevel @user | .repairlevel all",
  isStaff: true,

  async run({ sock, msg, args, sender, isOwner }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    // ── .repairlevel all (owner only) ─────────────────────────────────────────
    if ((args[0] || "").toLowerCase() === "all") {
      if (!isOwner) {
        return reply(
`╭━━━〔 ❌ 𝑷𝑬𝑹𝑴𝑰𝑺𝑺𝑰𝑶𝑵 𝑫𝑬𝑵𝑰𝑬𝑫 〕━━━╮
┃ ✦ Only the owner can repair all levels.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      await reply(
`╭━━━〔 ⚙️ 𝑹𝑬𝑷𝑨𝑰𝑹 𝑰𝑵 𝑷𝑹𝑶𝑮𝑹𝑬𝑺𝑺 〕━━━╮
┃ ✦ Scanning all registered players...
┃ ✦ This may take a moment.
╰━━━━━━━━━━━━━━━━━━━━╯`
      );

      try {
        const { fixed, total } = await repairAllLevels();
        return reply(
`╭━━━〔 ✅ 𝑹𝑬𝑷𝑨𝑰𝑹 𝑪𝑶𝑴𝑷𝑳𝑬𝑻𝑬 〕━━━╮
┃ ✦ Level repair finished!
┃
┃ 👥 Players scanned › ${total}
┃ 🔧 Levels restored › ${fixed}
┃ ✅ Already correct  › ${total - fixed}
┃
┃ 💡 All affected players have been
┃    restored to their correct level.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      } catch (err) {
        console.error("[repairlevel] bulk repair error:", err);
        return reply(
`╭━━━〔 ❌ 𝑬𝑹𝑹𝑶𝑹 〕━━━╮
┃ ✦ Repair failed — check logs.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }
    }

    // ── .repairlevel @user ────────────────────────────────────────────────────
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    let targetJid   = null;

    if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]?.match(/^[0-9]+$/)) {
      targetJid = `${args[0]}@s.whatsapp.net`;
    }

    if (!targetJid) {
      return reply(
`╭━━━〔 ℹ️ 𝑼𝑺𝑨𝑮𝑬 〕━━━╮
┃ ✦ Repair a single player's level:
┃   .repairlevel @user
┃
┃ ✦ Repair everyone (owner only):
┃   .repairlevel all
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    try {
      const result = await repairUserLevel(targetJid);

      if (!result) {
        return reply(
`╭━━━〔 ❌ 𝑵𝑶𝑻 𝑭𝑶𝑼𝑵𝑫 〕━━━╮
┃ ✦ Player not found in the database.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      if (!result.changed) {
        return reply(
`╭━━━〔 ✅ 𝑳𝑬𝑽𝑬𝑳 𝑶𝑲 〕━━━╮
┃ ✦ This player's level is already correct.
┃
┃ ⭐ Level › 『 ${result.oldLevel} 』
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      return reply(
`╭━━━〔 🔧 𝑳𝑬𝑽𝑬𝑳 𝑹𝑬𝑺𝑻𝑶𝑹𝑬𝑫 〕━━━╮
┃ ✦ Player level has been repaired!
┃
┃ ❌ Old Level › 『 ${result.oldLevel} 』
┃ ✅ New Level › 『 ${result.newLevel} 』
┃
┃ 💡 Level restored from accumulated XP.
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    } catch (err) {
      console.error("[repairlevel] single repair error:", err);
      return reply(
`╭━━━〔 ❌ 𝑬𝑹𝑹𝑶𝑹 〕━━━╮
┃ ✦ Repair failed — please try again.
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }
  },
};
