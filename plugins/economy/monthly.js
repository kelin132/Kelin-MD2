import { getUser, saveUser, requireRegistration, addHistory } from "./database.js";

export default {
  name: "monthly",
  description: "Claim your monthly reward (30-day cooldown)",
  category: "economy",
  usage: ".monthly",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 30 * 24 * 60 * 60 * 1000;

    if (now - (user.lastMonthly || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastMonthly);
      const days    = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours   = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      return sock.sendMessage(msg.key.remoteJid, {
        text: `⏰ *Monthly Cooldown Active*\n\nYou can claim your monthly reward in:\n⏳ *${days}d ${hours}h*`
      }, { quoted: msg });
    }

    const baseReward  = 25000 + Math.floor(Math.random() * 25000); // $25k–$50k
    const premiumMult = user.isPremium ? 2 : 1;
    const reward      = Math.floor(baseReward * premiumMult);
    const xpReward    = 1000;

    user.money       += reward;
    user.lastMonthly  = now;
    user.xp           = (user.xp || 0) + xpReward;

    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > user.level;
    user.level     = newLevel;

    await saveUser(sender, user);
    await addHistory(sender, "monthly", reward, `Monthly reward claimed`);

    let text =
      `📅 *Monthly Reward Claimed!*\n\n` +
      `💰 Received  : $${reward.toLocaleString()}` +
      (user.isPremium ? ` _(×2 premium bonus)_` : ``) +
      `\n🔮 XP Gained : +${xpReward}\n` +
      `💵 Balance   : $${user.money.toLocaleString()}\n\n` +
      `_Come back next month for your next reward!_`;

    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    // Extra: bonus item for premium
    if (user.isPremium) {
      text += `\n🎁 *Premium Bonus:* +1 Mystery Box added to inventory!`;
      user.inventory = user.inventory || [];
      user.inventory.push({ item: "Mystery Box", quantity: 1, ts: now });
      await saveUser(sender, user);
    }

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
