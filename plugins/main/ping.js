export default {
  name: "ping",
  description: "Check if the bot is responsive",
  category: "main",
  usage: ".ping",
  aliases: ["p"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const start = Date.now();
    await sock.sendMessage(msg.key.remoteJid, { text: "Pinging..." });
    const ping = Date.now() - start;
    await sock.sendMessage(msg.key.remoteJid, { text: `Pong! 🏓 ${ping}ms` });
  },
};
