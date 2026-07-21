// plugins/owner/broadcast.js
// Broadcast a message or media to every group the bot is in.

export default {
  name: "broadcast",
  description: "Broadcast a message to all groups",
  category: "owner",
  usage: ".broadcast <message>",
  aliases: ["bc"],
  cooldown: 5,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.1.0",

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      if (!text) {
        return await sock.sendMessage(jid, {
          text:
            "❌ *Usage:*\n.broadcast <message>\n\n" +
            "Example:\n.broadcast Hello everyone!"
        }, { quoted: msg });
      }

      // Send a quick ack reaction
      try {
        await sock.sendMessage(jid, {
          react: { text: "⚡", key: msg.key }
        });
      } catch { /* reactions optional */ }

      // Fetch all groups the bot participates in
      const chats  = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);

      if (!groups.length) {
        return await sock.sendMessage(jid, {
          text: "⚠️ Bot is not in any groups yet."
        }, { quoted: msg });
      }

      let success = 0;
      let failed  = 0;

      for (const group of groups) {
        try {
          await sock.sendMessage(group.id, {
            text:
              `╭━━━〔 📢 BROADCAST 〕━━━╮\n\n` +
              `${text}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `> THIS MESSAGE WAS BROADCASTED BY THE OWNER\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🤖 AKIRA` +
              `╰━━━━━━━━━━━━━━━━━━━━╯`
          });
          success++;

          // Small delay to avoid rate-limit kicks
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`Broadcast failed for ${group.subject}:`, err.message);
          failed++;
        }
      }

      // Done — report
      await sock.sendMessage(jid, {
        text:
          `✅ *Broadcast Complete!*\n\n` +
          `📨 Total Groups: ${groups.length}\n` +
          `✅ Sent: ${success}\n` +
          `❌ Failed: ${failed}`
      }, { quoted: msg });

    } catch (err) {
      console.error("BROADCAST ERROR:", err);
      await sock.sendMessage(jid, {
        text: `❌ Broadcast failed!\n\n${err.message}`
      }, { quoted: msg });
    }
  }
};
