export default {
  name: "support",
  description: "Get bot support groups",
  category: "main",
  usage: ".support",
  aliases: ["group", "helpgroup"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg }) {
    try {
      const supportMessage = `
╭━━━〔 🌸 KELIN-MD SUPPORT 〕━━━╮

✨ Need help with the bot?
✨ Found a bug?
✨ Want updates and new features?

Join our official support group:

🔗 https://chat.whatsapp.com/EIw91iFyLXOAMgjFg6gmZI?s=cl&p=a&mlu=0&amv=2

╰━━━━━━━━━━━━━━━━━━━━╯

🌸 Stay connected, Nakama!
⚔️ Anime power activated...
`;

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: supportMessage
        },
        { quoted: msg }
      );

    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to send support link."
        },
        { quoted: msg }
      );
    }
  }
};