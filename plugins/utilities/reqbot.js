// plugins/utilities/reqbot.js
// Member requests the bot to join their group.
// The request is forwarded to the staff notification group.

const NOTIFY_INVITE_CODE = "Ev3QxE7PW4N1rZ7pX36nun"; // group where requests land

export default {
  name: "reqbot",
  description: "Request the bot to be added to your group",
  category: "main",
  usage: ".reqbot <group_link>",
  aliases: ["botrequest", "requestbot"],
  cooldown: 30,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.1.0",

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    try {
      if (!text) {
        return await sock.sendMessage(jid, {
          text:
            "❌ Please provide your group invite link.\n\n" +
            "Example:\n.reqbot https://chat.whatsapp.com/XXXXXXXXXXXX"
        }, { quoted: msg });
      }

      const inviteRegex = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
      if (!inviteRegex.test(text.trim())) {
        return await sock.sendMessage(jid, {
          text: "❌ That doesn't look like a valid WhatsApp group invite link."
        }, { quoted: msg });
      }

      // ── Resolve the notification group JID ─────────────────────────────
      let notifyJid;
      try {
        const info = await sock.groupGetInviteInfo(NOTIFY_INVITE_CODE);
        notifyJid = info.id;
      } catch {
        // Bot may not be in the group yet — fall back to owner DM
        const { createRequire } = await import("module");
        const require = createRequire(import.meta.url);
        const settings = require("../../settings.cjs");
        notifyJid = `${settings.ownerNumber}@s.whatsapp.net`;
      }

      const requestMessage =
        `╭━━━〔 📩 BOT REQUEST 〕━━━╮\n\n` +
        `👤 *Requested By:*\n` +
        `• JID: ${sender}\n` +
        `• Number: +${sender.split("@")[0]}\n\n` +
        `📎 *Group Link:*\n${text.trim()}\n\n` +
        `🕒 *Time:* ${new Date().toLocaleString()}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Reply or use *.join <link>* to add the bot.\n` +
        `╰━━━━━━━━━━━━━━━━━━╯`;

      await sock.sendMessage(notifyJid, { text: requestMessage });

      await sock.sendMessage(jid, {
        text:
          `✅ *Request sent!*\n\n` +
          `Your bot request has been forwarded to the staff group.\n` +
          `Please wait while the team reviews it.`
      }, { quoted: msg });

    } catch (err) {
      console.error("REQBOT ERROR:", err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to send your request. Please try again later."
      }, { quoted: msg });
    }
  }
};
