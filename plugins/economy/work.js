import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

const jobs = {
  programmer: { pay: 1500, emoji: "👨‍💻", xp: 80 },
  hacker:     { pay: 2500, emoji: "🎭", xp: 120 },
  farmer:     { pay: 800,  emoji: "👨‍🌾", xp: 40 },
  doctor:     { pay: 2000, emoji: "⚕️",  xp: 100 },
  teacher:    { pay: 1200, emoji: "👨‍🏫", xp: 60 },
  police:     { pay: 1800, emoji: "👮",  xp: 90 },
  artist:     { pay: 1400, emoji: "🎨",  xp: 70 },
  chef:       { pay: 1600, emoji: "👨‍🍳", xp: 80 },
  trader:     { pay: 3000, emoji: "📈",  xp: 150 },
  mechanic:   { pay: 1700, emoji: "🔧",  xp: 85 },
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
      const list = Object.entries(jobs)
        .map(([name, j]) => `${j.emoji} *${name}* — $${j.pay.toLocaleString()} (+${j.xp}xp)`)
        .join("\n");
      return sock.sendMessage(msg.key.remoteJid, {
        text: `💼 *Available Jobs*\n\n${list}\n\n📝 Usage: *.work <job_name>*`
      }, { quoted: msg });
    }

    const jobName = args[0].toLowerCase();
    const job     = jobs[jobName];

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

    const bonus    = Math.floor(Math.random() * 200);
    const total    = job.pay + bonus;
    user.money    += total;
    user.lastWork  = now;
    user.xp        = (user.xp || 0) + job.xp;

    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > user.level;
    user.level     = newLevel;

    await saveUser(sender, user);
    await addHistory(sender, "work", total, `Worked as ${jobName}`);

    let text = `${job.emoji} *Work Complete!*\n\nJob     : ${jobName}\n💰 Earned : $${total.toLocaleString()}${bonus > 0 ? ` (+$${bonus} bonus!)` : ""}\n🔮 XP     : +${job.xp}\n💵 Balance: $${user.money.toLocaleString()}`;
    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
