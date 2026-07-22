import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const jobs = {
  // Original jobs (boosted pay)
  programmer:  { pay: 3500,  emoji: "👨‍💻", xp: 80  },
  hacker:      { pay: 5500,  emoji: "🎭", xp: 120 },
  farmer:      { pay: 2000,  emoji: "👨‍🌾", xp: 40  },
  doctor:      { pay: 4500,  emoji: "⚕️",  xp: 100 },
  teacher:     { pay: 2800,  emoji: "👨‍🏫", xp: 60  },
  police:      { pay: 3800,  emoji: "👮",  xp: 90  },
  artist:      { pay: 3200,  emoji: "🎨",  xp: 70  },
  chef:        { pay: 3600,  emoji: "👨‍🍳", xp: 80  },
  trader:      { pay: 7000,  emoji: "📈",  xp: 150 },
  mechanic:    { pay: 3900,  emoji: "🔧",  xp: 85  },
  // New high-paying jobs
  assassin:    { pay: 12000, emoji: "🗡️",  xp: 200 },
  kingpin:     { pay: 15000, emoji: "👑",  xp: 250 },
  spy:         { pay: 9000,  emoji: "🕵️",  xp: 180 },
  bountyHunter: { pay: 10500, emoji: "🎯",  xp: 190 },
  dragonTamer: { pay: 8500,  emoji: "🐉",  xp: 170 },
  alchemist:   { pay: 7500,  emoji: "⚗️",  xp: 160 },
  warlord:     { pay: 13500, emoji: "⚔️",  xp: 220 },
  hiredGun:    { pay: 11000, emoji: "🔫",  xp: 195 },
  cryptoWhale: { pay: 18000, emoji: "🐋",  xp: 300 },
  overlord:    { pay: 20000, emoji: "😈",  xp: 350 },
};

export default {
  name: "work",
  description: "Work to earn money (30-minute cooldown)",
  category: "economy",
  usage: ".work [job_name]",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0]) {
      const regular = ["programmer","hacker","farmer","doctor","teacher","police","artist","chef","trader","mechanic"];
      const premium = ["assassin","kingpin","spy","bountyHunter","dragonTamer","alchemist","warlord","hiredGun","cryptoWhale","overlord"];

      const regList = regular.map(n => {
        const j = jobs[n];
        return `  ${j.emoji} *${n}* — $${j.pay.toLocaleString()} (+${j.xp}xp)`;
      }).join("\n");

      const premList = premium.map(n => {
        const j = jobs[n];
        return `  ${j.emoji} *${n}* — $${j.pay.toLocaleString()} (+${j.xp}xp)`;
      }).join("\n");

      return sock.sendMessage(msg.key.remoteJid, {
        text:
`💼 *AVAILABLE JOBS*

━━━━ 🔹 Regular ━━━━
${regList}

━━━━ 💎 High Tier ━━━━
${premList}

📝 Usage: *.work <job_name>*
Example: .work cryptoWhale`
      }, { quoted: msg });
    }

    // Normalize: support camelCase or lowercase (e.g. bountyhunter → bountyHunter)
    const input   = args[0].toLowerCase().replace(/\s+/g, "");
    const jobKey  = Object.keys(jobs).find(k => k.toLowerCase() === input);
    const job     = jobKey ? jobs[jobKey] : null;

    if (!job) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Job not found!\n\nUse *.work* to see all available jobs.`
      }, { quoted: msg });
    }

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 30 * 60 * 1000;

    if (now - (user.lastWork || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastWork);
      const minutes   = Math.floor(remaining / (60 * 1000));
      return sock.sendMessage(msg.key.remoteJid, {
        text: `⏰ *You're tired!*\n\nRest for *${minutes}m* before working again.`
      }, { quoted: msg });
    }

    const bonus    = Math.floor(Math.random() * Math.floor(job.pay * 0.15));
    const total    = job.pay + bonus;
    user.money    += total;
    user.lastWork  = now;
    user.xp        = (user.xp || 0) + job.xp;

    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > user.level;
    user.level     = newLevel;

    await saveUser(sender, user);
    await addHistory(sender, "work", total, `Worked as ${jobKey}`);

    let text = `${job.emoji} *Work Complete!*\n\nJob     : ${jobKey}\n💰 Earned : $${total.toLocaleString()}${bonus > 0 ? ` (+$${bonus} bonus!)` : ""}\n🔮 XP     : +${job.xp}\n💵 Balance: $${user.money.toLocaleString()}`;
    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
