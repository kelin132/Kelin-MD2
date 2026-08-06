export default {
  name: "alive",
  description: "Check if KELIN MD is alive and running",
  category: "main",
  usage: ".alive",
  aliases: ["online", "status"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const secs = Math.floor(uptime % 60);
    const text = `*KELIN MD is Online!* ⚡\n\n> Uptime: ${hours}h ${mins}m ${secs}s\n> Status: Active\n> © KELIN MD`;
    await sock.sendMessage(msg.key.remoteJid, { text });
  },
};
