/**
 * KELIN MD — .dbzreset
 * Owner/staff command: wipe a player's Dragon Ball Z data and let them start fresh.
 *
 * Usage:
 *   .dbzreset @mention      — reset the mentioned player
 *   .dbzreset me            — reset your own data (dangerous, confirm required)
 *   .dbzreset me confirm    — actually wipe your own data
 *
 * Clears both legacy (dbz_players) and current (dbz_fighters) records.
 */

import { getDb } from "../../lib/mongo.mjs";

async function deletePlayerData(jid) {
  const db = await getDb();
  await Promise.all([
    db.collection("dbz_players").deleteOne({ jid }),
    db.collection("dbz_fighters").deleteOne({ ownerJid: jid }),
  ]);
}

export default {
  name: "dbzreset",
  description: "Reset a player's Dragon Ball Z data (owner/staff only)",
  category: "dragonball",
  usage: ".dbzreset @mention  |  .dbzreset me confirm",
  aliases: ["dbzclear", "dbzwipe", "resetdbz"],
  cooldown: 5,

  async run({ sock, msg, sender, args, isOwner, isStaff }) {
    const jid = msg.key.remoteJid;

    // ── Permission gate ───────────────────────────────────────────────────────
    if (!isOwner && !isStaff) {
      return sock.sendMessage(jid, {
        text: "❌ Only *owners* and *staff* can reset Dragon Ball Z data.",
      }, { quoted: msg });
    }

    const sub = (args[0] || "").toLowerCase();

    // ── Self-reset flow ───────────────────────────────────────────────────────
    if (sub === "me") {
      if ((args[1] || "").toLowerCase() !== "confirm") {
        return sock.sendMessage(jid, {
          text:
`⚠️ *DBZ SELF-RESET*

This will *permanently delete* your Dragon Ball Z progress:
• All stats, XP, level, zeni
• Your character selection
• Wins & losses record

To confirm, type: *.dbzreset me confirm*
_There is no undo._`,
        }, { quoted: msg });
      }

      await deletePlayerData(sender);
      return sock.sendMessage(jid, {
        text:
`🐉 *DBZ RESET COMPLETE*

Your Dragon Ball Z data has been wiped.
Start fresh with *.dbzstart*

_May your new journey be stronger!_ ⚡`,
      }, { quoted: msg });
    }

    // ── Reset a mentioned player ──────────────────────────────────────────────
    const mentioned =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.message?.imageMessage?.contextInfo?.mentionedJid?.[0] ||
      null;

    if (!mentioned) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🐉 *𝗗𝗕𝗭  𝗥𝗘𝗦𝗘𝗧* 〕
│ 📖 *Usage:*
│ • *.dbzreset @player* — reset a player's data
│ • *.dbzreset me confirm* — reset your own data
│
│ ⚠️ *Owner / Staff only*
│ 💡 All DBZ progress is permanently deleted.
└───────────────◆`,
      }, { quoted: msg });
    }

    // Fetch their name if possible
    const db = await getDb();
    const legacy  = await db.collection("dbz_players").findOne({ jid: mentioned });
    const fighter = await db.collection("dbz_fighters").findOne({ ownerJid: mentioned });

    if (!legacy && !fighter) {
      return sock.sendMessage(jid, {
        text: `❌ That player has no Dragon Ball Z data to reset.`,
      }, { quoted: msg });
    }

    const charName   = legacy?.character   || fighter?.name   || "Unknown Fighter";
    const playerName = legacy?.username    || fighter?.name   || mentioned.split("@")[0];
    const level      = legacy?.level       || fighter?.level  || "?";

    await deletePlayerData(mentioned);

    await sock.sendMessage(jid, {
      text:
`🐉 *DBZ DATA RESET*
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  👤 Player: *${playerName}*
  ⚡ Fighter: *${charName}*  (Lv. ${level})
  🗑️ Status: *Wiped from both collections*
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🌸 They can start fresh with *.dbzstart*`,
      mentions: [mentioned],
    }, { quoted: msg });
  },
};
