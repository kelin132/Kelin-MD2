import { getRpgUser, saveRpgUser } from "./db.js";

export default {
  name: "rpg-daily",
  aliases: ["rpgdaily", "rdaily"],
  category: "rpg",
  description: "Claim your daily RPG gold reward",
  usage: ".rpg-daily",
  cooldown: 5,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const user = await getRpgUser(sender);
    if (!user) return reply("❌ Start your RPG journey with *.rpg-start warrior* first.");

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const since = now - (Number(user.lastDaily) || 0);
    if (since < day) {
      return reply(`⏳ Your daily reward is ready in about *${Math.ceil((day - since) / 3600000)}h*.`);
    }

    user.dailyStreak = since < day * 2 ? (Number(user.dailyStreak) || 0) + 1 : 1;
    const reward = 250 + user.level * 50 + Math.min(user.dailyStreak, 7) * 25;
    user.gold += reward;
    user.lastDaily = now;
    await saveRpgUser(sender, user);
    return reply(
      `🎁 *RPG DAILY REWARD!*\n\n🔥 Streak: *${user.dailyStreak} day${user.dailyStreak === 1 ? "" : "s"}*\n` +
      `💰 Gold received: *+${reward}*\n💳 Balance: *${user.gold.toLocaleString()}*`,
    );
  },
};