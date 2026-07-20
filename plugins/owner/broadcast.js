import { sendReaction } from "./_helper.js";

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
  version: "1.0.0",

  async run({ sock, msg, sender, text }) {
    try {
      if (!text) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Usage:\n.broadcast <message>\n\nExample:\n.broadcast Hello everyone!"
          },
          { quoted: msg }
        );
      }

      await sendReaction({
        sock,
        msg,
        sender,
        type: "⚡"
      });

      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);

      let success = 0;
      let failed = 0;

      for (const group of groups) {
        try {
          await sock.sendMessage(group.id, {
            text: `╭━━━〔 📢 KELIN-MD BROADCAST 〕━━━╮

${text}

━━━━━━━━━━━━━━━━━━━━

> THIS MESSAGE WAS BROADCASTED BY THE OWNER

━━━━━━━━━━━━━━━━━━━━
🤖 KELIN-MD • Anime WhatsApp Bot
🌸 Thank you for using KELIN-MD!

╰━━━━━━━━━━━━━━━━━━━━╯`
          });

          success++;
        } catch (err) {
          console.error(`Failed to send to ${group.subject}:`, err);
          failed++;
        }
      }

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `✅ Broadcast completed!

📨 Total Groups: ${groups.length}
✅ Sent: ${success}
❌ Failed: ${failed}`
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Broadcast failed!\n\n${err.message}`
        },
        { quoted: msg }
      );
    }
  }
};