export default {
  name: "rules",
  description: "View the official bot rules",
  category: "main",
  usage: ".rules",
  aliases: ["botrules", "terms"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg }) {
    try {
      const rulesMessage = `
╭━━━〔 📜 KELIN-MD RULES 〕━━━╮

🌸 Welcome to KELIN-MD!

Before using the bot, please follow these rules:

1️⃣ Do not spam commands.
2️⃣ Do not abuse or exploit bot bugs.
3️⃣ Do not use the bot for illegal activities.
4️⃣ Respect other users and group members.
5️⃣ NSFW or offensive content is not allowed.
6️⃣ Do not modify or impersonate the bot.
7️⃣ The owner may blacklist users who abuse the bot.
8️⃣ Premium features are for premium users only.
9️⃣ If the bot is offline, please be patient.
🔟 Report bugs using the *.support* command.

━━━━━━━━━━━━━━━━━━━
⚠️ Breaking these rules may result in:
• Temporary blacklist
• Permanent blacklist
• Removal from support groups

🌸 Thank you for using KELIN-MD!
⚔️ Enjoy your anime adventure!

╰━━━━━━━━━━━━━━━━━━━╯
`;

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: rulesMessage,
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to display the bot rules."
        },
        { quoted: msg }
      );
    }
  }
};