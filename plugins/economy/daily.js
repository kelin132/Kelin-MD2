import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "daily",
  description: "Claim your daily reward (24-hour cooldown)",
  category: "economy",
  usage: ".daily",
  aliases: ["dailyclaim"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - (user.lastDaily || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);
      const hours     = Math.floor(remaining / (60 * 60 * 1000));
      const minutes   = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return sock.sendMessage(msg.key.remoteJid, {
        text: `⏰ *Cooldown Active*\n\nClaim your daily reward in:\n⏳ *${hours}h ${minutes}m*`
      }, { quoted: msg });
    }

    const reward      = 500 + Math.floor(Math.random() * 500); // $500–$1000
    user.money        += reward;
    user.lastDaily    = now;
    user.xp           = (user.xp || 0) + 50;

    // Level up every 1000 XP
    const newLevel = Math.floor(user.xp / 1000) + 1;
    const leveled  = newLevel > user.level;
    user.level     = newLevel;

    await saveUser(sender, user);

    let text = `✅ *Daily Reward Claimed!*\n\n💰 Received  : $${reward.toLocaleString()}\n🔮 XP Gained : +50\n💵 Balance   : $${user.money.toLocaleString()}`;
    if (leveled) text += `\n\n🎉 *LEVEL UP!* You are now Level ${user.level}!`;

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
