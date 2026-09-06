import { getUser, requireRegistration } from "./database.js";

const COOLDOWNS = [
  { key: "lastDaily",   label: "🌅 Daily",    ms: 24 * 60 * 60 * 1000         },
  { key: "lastWork",    label: "💼 Work",     ms: 10 * 60 * 1000               },
  { key: "lastCrime",   label: "🔪 Crime",    ms: 20 * 60 * 1000               },
  { key: "lastRob",     label: "🦹 Rob",      ms: 45 * 60 * 1000               },
  { key: "lastDig",     label: "⛏️  Dig",      ms: 30 * 60 * 1000               },
  { key: "lastFish",    label: "🎣 Fish",     ms: 20 * 60 * 1000               },
  { key: "lastGamble",  label: "🎰 Gamble",   ms:  5 * 60 * 1000               },
  { key: "lastBet",     label: "🎲 Bet",      ms: 30 * 1000                    },
  { key: "lastBeg",     label: "🤲 Beg",      ms:  3 * 60 * 1000               },
  { key: "lastSlots",   label: "🎰 Slots",    ms: 15 * 1000                    },
  { key: "lastScratch", label: "🎫 Scratch",  ms: 10 * 1000                    },
];

function fmtRemaining(ms) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000)  / 60_000);
  const s = Math.floor((ms % 60_000)     / 1000);
  if (d > 0) return `${d}d ${h}hrs left`;
  if (h > 0) return `${h}hrs ${m}mins left`;
  if (m > 0) return `${m}mins ${s}secs left`;
  return `${s}secs left`;
}

export default {
  name: "cds",
  aliases: ["mycds", "cooldown", "cooldowns", "timers"],
  category: "economy",
  cooldown: 6,
  description: "View only your active cooldowns",
  usage: ".cds",

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const now  = Date.now();

    const active = [];
    for (const cd of COOLDOWNS) {
      const last = user[cd.key] || 0;
      const rem  = cd.ms - (now - last);
      if (rem > 0) {
        active.push(`${cd.label.replace(/^[^A-Za-z]+/, "").toLowerCase()} - \`${fmtRemaining(rem)}\``);
      }
    }

    const text = active.length ? active.join("\n") : "All your cooldowns are done.";

    await sock.sendMessage(msg.key.remoteJid, {
      text,
      mentions: [sender],
    }, { quoted: msg });
  },
};
