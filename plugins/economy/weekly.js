import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "weekly",
  description: "Claim your weekly reward (7-day cooldown)",
  category: "economy",
  usage: ".weekly",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 7 * 24 * 60 * 60 * 1000;

    if (now - (user.lastWeekly || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastWeekly);
      const days    = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours   = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return sock.sendMessage(msg.key.remoteJid, {
        text: `⏰ *Weekly Cooldown Active*\n\nYou can claim your weekly reward in:\n⏳ *${days}d ${hours}h ${minutes}m*`
      }, { quoted: msg });
    }

    const baseReward  = 5000 + Math.floor(Math.random() * 5000); // $5,000–$10,000
    // Premium bonus
    const premiumMult = user.isPremium ? 1.5 : 1;
    const reward      = Math.floor(baseReward * premiumMult);
    const xpReward    = 250;

    user.money      += reward;
    user.lastWeekly  = now;
    user.xp          = (user.xp || 0) + xpReward;

    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > user.level;
    user.level     = newLevel;

    await saveUser(sender, user);
    await addHistory(sender, "weekly", reward, `Weekly reward claimed`);

    let text =
      `🗓️ *Weekly Reward Claimed!*\n\n` +
      `💰 Received  : $${reward.toLocaleString()}` +
      (user.isPremium ? ` _(+50% premium bonus)_` : ``) +
      `\n🔮 XP Gained : +${xpReward}\n` +
      `💵 Balance   : $${user.money.toLocaleString()}\n\n` +
      `_Come back in 7 days for your next reward!_`;

    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
