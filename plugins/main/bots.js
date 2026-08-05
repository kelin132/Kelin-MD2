import {
  isBotOnline,
  listRegisteredBots,
  markBotSessionDeleted,
} from "../../lib/botRegistry.mjs";

export default {
  name: "bots",
  description: "Show paired bots and their online status",
  category: "main",
  usage: ".bots",
  aliases: ["botlist", "botstatus"],
  cooldown: 10,

  async run({ sock, msg, sender, isOwner }) {
    const jid = msg.key.remoteJid;

    // ── Owner sub-command: .bots delete <number> ──────────────────────────────
    const raw = (msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text || "").trim();
    const parts = raw.split(/\s+/);
    if (isOwner && parts[1]?.toLowerCase() === "delete" && parts[2]) {
      const num = parts[2].replace(/\D/g, "");
      await markBotSessionDeleted(num);
      return sock.sendMessage(jid, {
        text: `✅ Bot *${num}* has been removed from the list.`,
      }, { quoted: msg });
    }

    let bots;
    try {
      bots = await listRegisteredBots();
    } catch {
      return sock.sendMessage(jid, {
        text: "❌ I couldn't read the bot registry right now.",
      }, { quoted: msg });
    }

    const now = Date.now();
    const onlineBots = bots.filter((b) => isBotOnline(b, now));

    const lines = bots.length
      ? bots.map((bot) => {
          const online = isBotOnline(bot, now);
          const name   = bot.botName || "Unnamed Bot";
          const emoji  = online ? "🟢" : "🔴";
          // Offline: show only name + offline indicator
          return `${emoji} *${name}*`;
        }).join("\n")
      : "No paired bots registered yet.";

    const text =
`╭━━━〔 🌸 *AKIRA BOTS* 🌸 〕━━━╮
│ 🟢 Online: *${onlineBots.length}*  /  🌸 Total: *${bots.length}*
╰━━━━━━━━━━━━━━━━━━━━━━╯

${lines}

_Owners: .bots delete <number> to hide a bot_`;

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
