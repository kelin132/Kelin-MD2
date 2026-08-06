/**
 * KELIN MD — DBZ Roster Sync (plugins/dbz/dbzsync.js)
 * .dbzsync — (mod/admin only) sync the Dragon Ball API roster to MongoDB
 *
 * Run once on first setup, or when you want to refresh the character roster.
 */

import { syncCharacters, isCachePopulated } from "../../lib/dbz/api.mjs";

export default {
  name:        "dbzsync",
  aliases:     ["dbzrefresh", "dbzload"],
  description: "Sync the Dragon Ball Z roster from the API (admin only)",
  category:    "dbz",
  usage:       ".dbzsync",

  async run({ sock, msg, sender, isOwner, staffLevel }) {
    const jid = msg.key.remoteJid;

    if (!isOwner && Number(staffLevel) < 3) {
      return sock.sendMessage(jid, {
        text: "❌ Only the bot owner or staff level 3+ can sync the DBZ roster.",
      }, { quoted: msg });
    }

    const already = await isCachePopulated().catch(() => false);
    const status  = already ? "🔄 Refreshing DBZ roster from API..." : "⏳ Loading DBZ roster for the first time...";

    await sock.sendMessage(jid, { text: status }, { quoted: msg });

    try {
      const count = await syncCharacters();
      await sock.sendMessage(jid, {
        text: `✅ *DBZ Sync complete!*\n${count} characters synced to the database.\nUse *.dbzselect* to browse the roster.`,
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ Sync failed: ${err?.message || "Unknown error"}\nCheck the bot logs for details.`,
      }, { quoted: msg });
    }
  },
};
