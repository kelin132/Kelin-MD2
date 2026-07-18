export default {
  name: "runtime",
  description: "Show bot runtime and system stats",
  category: "main",
  usage: ".runtime",
  aliases: ["uptime", "stats"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    const uptime = process.uptime();
    const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*KELIN MD Runtime* ⚡\n\n⏱ Uptime: ${h}h ${m}m ${s}s\n💾 RAM: ${memMb} MB\n🖥️ Node: ${process.version}\n© KELIN MD`,
    });
  },
};
