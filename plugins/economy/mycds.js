import { getUser, requireRegistration } from "./database.js";

const COOLDOWNS = [
  { key: "lastDaily",   label: "🌅 Daily",    ms: 24 * 60 * 60 * 1000         },
  { key: "lastWeekly",  label: "🗓️  Weekly",   ms: 7  * 24 * 60 * 60 * 1000    },
  { key: "lastMonthly", label: "📅 Monthly",  ms: 30 * 24 * 60 * 60 * 1000    },
  { key: "lastWork",    label: "💼 Work",     ms: 30 * 60 * 1000               },
  { key: "lastCrime",   label: "🔪 Crime",    ms: 60 * 60 * 1000               },
  { key: "lastRob",     label: "🦹 Rob",      ms: 45 * 60 * 1000               },
  { key: "lastDig",     label: "⛏️  Dig",      ms: 30 * 60 * 1000               },
  { key: "lastFish",    label: "🎣 Fish",     ms: 20 * 60 * 1000               },
  { key: "lastGamble",  label: "🎰 Gamble",   ms:  5 * 60 * 1000               },
];

function fmtRemaining(ms) {
  if (ms <= 0) return "✅ Ready";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000)  / 60_000);
  const s = Math.floor((ms % 60_000)     / 1000);
  if (d > 0) return `⏳ ${d}d ${h}h`;
  if (h > 0) return `⏳ ${h}h ${m}m`;
  if (m > 0) return `⏳ ${m}m ${s}s`;
  return `⏳ ${s}s`;
}

export default {
  name: "mycds",
  aliases: ["cooldowns", "cds", "timers"],
  category: "economy",
  description: "View all your remaining cooldowns at a glance",
  usage: ".mycds",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const now  = Date.now();

    let text = `⏰ *YOUR COOLDOWNS*\n👤 @${sender.split("@")[0]}\n\n`;

    for (const cd of COOLDOWNS) {
      const last = user[cd.key] || 0;
      const rem  = cd.ms - (now - last);
      text += `${cd.label.padEnd(14)} ${fmtRemaining(rem)}\n`;
    }

    text += "\n_All cooldowns reset automatically._";

    await sock.sendMessage(msg.key.remoteJid, {
      text,
      mentions: [sender],
    }, { quoted: msg });
  },
};
