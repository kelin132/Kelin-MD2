import { getUser, requireRegistration } from "./database.js";

const COOLDOWNS = [
  { key: "lastWork",    label: "💼 Work",     ms: 10 * 60 * 1000               },
  { key: "lastCrime",   label: "🔪 Crime",    ms: 20 * 60 * 1000               },
  { key: "lastRob",     label: "🦹 Rob",      ms: 45 * 60 * 1000               },
  { key: "lastDig",     label: "⛏️ Dig",      ms: 10 * 1000                    },
  { key: "lastFish",    label: "🎣 Fish",     ms: 10 * 1000                    },
  { key: "lastGamble",  label: "🎰 Gamble",   ms:  5 * 60 * 1000               },
  { key: "lastBet",     label: "🎲 Bet",      ms: 30 * 1000                    },
  { key: "lastBeg",     label: "🤲 Beg",      ms:  3 * 60 * 1000               },
  { key: "lastSlots",   label: "🎰 Slots",    ms: 15 * 1000                    },
  { key: "lastScratch", label: "🎫 Scratch",  ms: 10 * 1000                    },
];

function fmtRemaining(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const d = Math.floor(totalSeconds / 86_400);
  const h = Math.floor((totalSeconds % 86_400) / 3_600);
  const m = Math.floor((totalSeconds % 3_600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m left`;
  return `${s}s left`;
}

export default {
  name: "mycds",
  aliases: ["cooldown", "cooldowns", "cds", "timers"],
  category: "economy",
  cooldown: 6,
  description: "View all your remaining cooldowns at a glance",
  usage: ".mycds",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const now  = Date.now();

    const activeCooldowns = [];
    for (const cd of COOLDOWNS) {
      const last = user[cd.key] || 0;
      const rem  = cd.ms - (now - last);
      if (rem > 0) activeCooldowns.push({ ...cd, rem });
    }

    if (activeCooldowns.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "✅ All your cooldowns are ready to go!",
      }, { quoted: msg });
      return;
    }

    const text = [
      "⏳ Active cooldowns:",
      ...activeCooldowns.map((cd) => `${cd.label} - \`${fmtRemaining(cd.rem)}\``),
    ].join("\n");

    await sock.sendMessage(msg.key.remoteJid, {
      text,
    }, { quoted: msg });
  },
};
