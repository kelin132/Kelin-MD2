// plugins/utilities/reminder.js
// .reminder <time> <message> — Set a personal timed reminder
// Supports: 30s, 10m, 2h, 1d

function parseTime(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit  = match[2].toLowerCase();
  const mult  = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * mult[unit];
}

const MAX_MS  = 24 * 3_600_000; // 24 hours max
const MAX_PER = 3;               // max active reminders per user

const active = new Map(); // sender → count

export default {
  name: "reminder",
  description: "Set a timed reminder",
  category: "utilities",
  usage: ".reminder <time> <message>  (e.g. .reminder 10m Check the oven)",
  aliases: ["remind", "remindme"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: [
          `⏰ *REMINDER*`,
          ``,
          `Usage: *.reminder <time> <message>*`,
          ``,
          `Time formats:`,
          `• *30s* — 30 seconds`,
          `• *10m* — 10 minutes`,
          `• *2h*  — 2 hours`,
          `• *1d*  — 1 day (max)`,
          ``,
          `Example: *.reminder 30m Check the oven*`,
        ].join("\n"),
      }, { quoted: msg });
    }

    const ms = parseTime(args[0]);
    if (!ms) {
      return sock.sendMessage(jid, {
        text: `❌ Invalid time format.\n\nExamples: *30s*, *10m*, *2h*, *1d*`,
      }, { quoted: msg });
    }

    if (ms > MAX_MS) {
      return sock.sendMessage(jid, {
        text: `❌ Max reminder time is *24 hours*.`,
      }, { quoted: msg });
    }

    const count = active.get(sender) || 0;
    if (count >= MAX_PER) {
      return sock.sendMessage(jid, {
        text: `❌ You already have *${MAX_PER}* active reminders. Wait for one to fire.`,
      }, { quoted: msg });
    }

    const reminderText = args.slice(1).join(" ").trim();
    if (!reminderText) {
      return sock.sendMessage(jid, {
        text: `❌ Please add a reminder message!\n\nExample: *.reminder 10m Drink water*`,
      }, { quoted: msg });
    }

    // Friendly display of time
    const totalSec = Math.floor(ms / 1000);
    const dispH    = Math.floor(totalSec / 3600);
    const dispM    = Math.floor((totalSec % 3600) / 60);
    const dispS    = totalSec % 60;
    const dispStr  = [dispH && `${dispH}h`, dispM && `${dispM}m`, dispS && `${dispS}s`]
      .filter(Boolean).join(" ");

    const senderNum = sender.split("@")[0].split(":")[0];

    active.set(sender, (active.get(sender) || 0) + 1);

    await sock.sendMessage(jid, {
      text: `✅ *Reminder set!*\n\n⏰ I'll remind you in *${dispStr}*.\n📝 "${reminderText}"`,
    }, { quoted: msg });

    setTimeout(async () => {
      active.set(sender, Math.max(0, (active.get(sender) || 1) - 1));
      try {
        await sock.sendMessage(jid, {
          text: [
            `🔔 *REMINDER* @${senderNum}`,
            ``,
            `📝 ${reminderText}`,
            ``,
            `> Set ${dispStr} ago`,
          ].join("\n"),
          mentions: [sender],
        });
      } catch {
        // Chat may no longer be available
      }
    }, ms);
  },
};
