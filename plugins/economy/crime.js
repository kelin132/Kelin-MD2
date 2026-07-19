import { getUser, saveUser, requireRegistration, jailUser, addHistory } from "./database.js";

const crimes = [
  { name: "pickpocketing",   emoji: "🤌", reward: [300, 800]   },
  { name: "shoplifting",     emoji: "🛍️", reward: [500, 1200]  },
  { name: "car theft",       emoji: "🚗", reward: [1000, 2500] },
  { name: "bank fraud",      emoji: "🏦", reward: [2000, 5000] },
  { name: "hacking",         emoji: "💻", reward: [1500, 4000] },
];

export default {
  name: "crime",
  description: "Commit a crime — high risk, high reward (20-min cooldown)",
  category: "economy",
  usage: ".crime",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 20 * 60 * 1000;

    if (now - (user.lastCrime || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastCrime);
      const minutes   = Math.floor(remaining / (60 * 1000));
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🚨 *Police Alert!*\n\nLay low for *${minutes}m* more.`
      }, { quoted: msg });
    }

    const crime   = crimes[Math.floor(Math.random() * crimes.length)];
    const success = Math.random() > 0.4; // 60% success
    const [min, max] = crime.reward;
    const reward  = Math.floor(Math.random() * (max - min)) + min;

    user.lastCrime = now;

    if (success) {
      user.money += reward;
      user.xp     = (user.xp || 0) + 30;
      await saveUser(sender, user);
      await addHistory(sender, "crime", reward, `Crime: ${crime.name}`);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `${crime.emoji} *Crime Successful!*\n\nYou pulled off *${crime.name}*!\n💰 Stolen   : $${reward.toLocaleString()}\n💵 Balance  : $${user.money.toLocaleString()}`
      }, { quoted: msg });
    } else {
      const fine  = Math.floor(reward * 0.5);
      user.money  = Math.max(0, user.money - fine);
      await saveUser(sender, user);
      // Jail for 10 minutes on crime fail
      await jailUser(sender, 10 * 60 * 1000);
      await addHistory(sender, "crime", -fine, `Crime caught: ${crime.name} — fined & jailed 10m`);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `🚔 *Crime Failed!*\n\nYou got caught committing *${crime.name}*!\n💸 Fine     : $${fine.toLocaleString()}\n🔒 Jailed   : 10 minutes\n💵 Balance  : $${user.money.toLocaleString()}\n\n_Use economy commands again after 10 minutes._`
      }, { quoted: msg });
    }
  }
};
