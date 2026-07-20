export default {
  name: "reqbot",
  description: "Request the bot to be added to your group",
  category: "main",
  usage: ".reqbot <group_link>",
  aliases: ["botrequest", "requestbot"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, sender, text }) {
    try {
      if (!text) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              "❌ Please provide your group invite link.\n\nExample:\n.reqbot https://chat.whatsapp.com/XXXXXXXXXXXX"
          },
          { quoted: msg }
        );
      }

      const inviteRegex = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

      if (!inviteRegex.test(text.trim())) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ That doesn't look like a valid WhatsApp group invite link."
          },
          { quoted: msg }
        );
      }

      // Replace with your WhatsApp number
      const ownerJid = "YOUR_NUMBER@s.whatsapp.net";

      const requestMessage = `
╭━━━〔 🤖 BOT REQUEST 〕━━━╮

👤 Request By:
${sender}

📎 Group Link:
${text.trim()}

🕒 Time:
${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━
Reply to this user if you want to join.
╰━━━━━━━━━━━━━━━━━━╯
`;

      // Send request to bot owner's DM
      await sock.sendMessage(ownerJid, {
        text: requestMessage
      });

      // Confirmation to requester
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `✅ Your bot request has been sent successfully!

Please wait while the owner reviews your request.`
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to send your request. Please try again later."
        },
        { quoted: msg }
      );
    }
  }
};