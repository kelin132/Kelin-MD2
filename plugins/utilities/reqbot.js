// plugins/utilities/reqbot.js
// Member requests the bot to join their group.
// Requests are queued until a bot admin in the staff notification group forwards them.
import { enqueueReqbotRequest } from "../../lib/reqbotRelay.mjs";

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
            "❌ *Please provide your group invite link*.\n\n" +
            "Example:\n.reqbot https://chat.whatsapp.com/XXXXXXXXXXXX"
        }, { quoted: msg });
      }

      const groupLink = text.trim();
      const inviteRegex = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?$/i;
      if (!inviteRegex.test(groupLink)) {
        return await sock.sendMessage(jid, {
          text: "❌ That doesn't look like a valid WhatsApp group invite link."
        }, { quoted: msg });
      }

      const requestId = await enqueueReqbotRequest({
        sender,
        groupLink,
        sourceChatJid: jid,
        sourceBotName: process.env.BOT_NAME || "KELIN MD",
      });

      // Remove the user's invite-link message after it's safely queued.
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

      await sock.sendMessage(jid, {
        text:
          `✅ *Request queued!*\n\n` +
          `It will be forwarded by a bot that is an admin in the staff-request group.\n` +
          `Request ID: \`${requestId.slice(0, 8)}\``
      }, { quoted: msg });

    } catch (err) {
      console.error("REQBOT ERROR:", err);
      await sock.sendMessage(jid, {
        text: "❌ Failed to send your request. Please try again later."
      }, { quoted: msg });
    }
  }
};
