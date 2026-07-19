export default {
  name: "broadcast",
  description: "Broadcast a message to all chats",
  category: "owner",
  usage: ".broadcast <message>",
  aliases: ["bc"],
  cooldown: 30,
  isOwner: true,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .broadcast <message>" });
      return;
    }
    await sock.sendMessage(msg.key.remoteJid, {
      text: `Broadcast sent: "${text}"`,
    });
  },
};
