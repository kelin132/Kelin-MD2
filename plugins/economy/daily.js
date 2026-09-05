import { getUser, saveUser, requireRegistration, checkLevelUp } from "./database.js";

function fmt(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

export default {
  name: "daily",
  description: "Claim your daily reward (24-hour cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".daily",
  aliases: ["dailyclaim"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const jid      = msg.key.remoteJid;

    // Default values if streak isn't yet set on user
    const streak = user.streak || 1; 
    const streakBonus = 300;

    if (now - (user.lastDaily || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);
      const hours     = Math.floor(remaining / (60 * 60 * 1000));
      const minutes   = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      const limitCaption = 
`⏳ You've already claimed your daily reward today! Next claim available in ${hours}h ${minutes}m.

│ Reminder: You have a web daily reward waiting to be claimed!
Claim it here: https://aidoru.zone.id/arcade`;

      return sock.sendMessage(jid, { text: limitCaption }, { quoted: msg });
    }

    const reward   = 50000 + Math.floor(Math.random() * 50000);
    const xpBonus  = 200;
    
    user.money    += (reward + streakBonus);
    user.lastDaily = now;
    user.xp        = (user.xp || 0) + xpBonus;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);

    const claimCaption = 
`🎉 You've claimed your daily reward of ${fmt(reward)} coins + ${streakBonus} streak bonus (streak: ${streak})! Your new balance is ${fmt(user.money)} coins.${leveled ? `\n\n⭐ *LEVEL UP!* You are now Level ${newLevel}!` : ""}

│ Reminder: You have a web daily reward waiting to be claimed!
Claim it here: https://aidoru.zone.id/arcade`;

    await sock.sendMessage(jid, { text: claimCaption }, { quoted: msg });
  },
};
