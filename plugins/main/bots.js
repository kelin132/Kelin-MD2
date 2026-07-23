import {
  formatDuration,
  isBotOnline,
  listRegisteredBots,
} from "../../lib/botRegistry.mjs";

export default {
  name: "bots",
  description: "Show paired bots and their online status and uptime",
  category: "main",
  usage: ".bots",
  aliases: ["botlist", "botstatus"],
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    let bots;
    try {
      bots = await listRegisteredBots();
    } catch (err) {
      console.error("[bots] Failed to read bot registry:", err.message);
      return sock.sendMessage(jid, {
        text: "❌ I couldn't read the bot registry right now. MongoDB may be unavailable.",
      }, { quoted: msg });
    }

    const now = Date.now();
    const onlineBots = bots.filter((bot) => isBotOnline(bot, now));
    const lines = bots.length
      ? bots.map((bot, index) => {
        const online = isBotOnline(bot, now);
        const name = bot.botName || "Unnamed Bot";
        const number = bot.number ? `+${bot.number}` : "Unknown number";

        if (online) {
          const startedAt = new Date(bot.startedAt).getTime();
          const uptime = Number.isFinite(startedAt)
            ? formatDuration(now - startedAt)
            : "Unknown";
          return `${index + 1}. 🟢 *${name}*\n   Number: ${number}\n   Status: *Online*\n   Uptime: *${uptime}*`;
        }

        const lastSeenAt = bot.lastSeenAt ? new Date(bot.lastSeenAt) : null;
        const lastSeen = lastSeenAt && !Number.isNaN(lastSeenAt.getTime())
          ? lastSeenAt.toLocaleString()
          : "Unknown";
        return `${index + 1}. 🔴 *${name}*\n   Number: ${number}\n   Status: *Offline*\n   Last seen: *${lastSeen}*`;
      }).join("\n\n")
      : "No paired bots have registered yet.";

    const text =
`🤖 *PAIRED BOTS*

🟢 Online: *${onlineBots.length}*
📊 Total registered: *${bots.length}*

${lines}`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
