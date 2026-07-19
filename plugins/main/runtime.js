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
  version: "2.0.0",

  async run({ sock, msg }) {
    const uptime = process.uptime();
    const memory = process.memoryUsage().rss / 1024 / 1024;

    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    const runtime = `${h}h ${m}m ${s}s`;

    const text = `
╭━━━〔 ⚡ *KELIN MD* ⚡ 〕━━━╮

♡ *Bot Statistics*

⌬ ⏱️ Runtime : ${runtime}
⌬ 💾 RAM : ${memory.toFixed(2)} MB
⌬ 🖥️ Node.js : ${process.version}
⌬ 🚀 Status : Online
⌬ 💖 Version : v2.0.0

╰━━━━━━━━━━━━━━━━━━━━╯

「 Fast • Stable • Powerful 」
      ♡ KELIN MD ♡
`;

    await sock.sendMessage(msg.key.remoteJid, {
      text,
    });
  },
};