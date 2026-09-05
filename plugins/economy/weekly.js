import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";

function fmt(n) {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "weekly",
  description: "Claim your weekly reward (7-day cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".weekly",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 7 * 24 * 60 * 60 * 1000;
    const jid      = msg.key.remoteJid;

    if (now - (user.lastWeekly || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastWeekly);
      const days    = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours   = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return sock.sendMessage(jid, {
        text: `⏳ You've already claimed your weekly reward! Next claim available in ${days}d ${hours}h ${minutes}m.`,
      }, { quoted: msg });
    }

    const baseReward  = 5000 + Math.floor(Math.random() * 5000);
    const premiumMult = user.isPremium ? 1.5 : 1;
    const reward      = Math.floor(baseReward * premiumMult);
    const xpReward    = 250;

    user.money      += reward;
    user.lastWeekly  = now;
    user.xp          = (user.xp || 0) + xpReward;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);
    await addHistory(sender, "weekly", reward, `Weekly reward claimed`);

    await sock.sendMessage(jid, {
      text:
`🎉 You've claimed your weekly reward of ${fmt(reward)} coins${user.isPremium ? " (+50% premium)" : ""}! Your new balance is ${fmt(user.money)} coins.
🔮 XP: +${xpReward}${leveled ? `\n⭐ *LEVEL UP!* You are now Level ${user.level}!` : ""}`,
    }, { quoted: msg });
  }
};
