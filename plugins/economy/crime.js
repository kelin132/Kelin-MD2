```javascript
import { getUser, saveUser, requireRegistration, jailUser, addHistory } from "./database.js";

const crimes = [
  { name: "pickpocketing",   emoji: "🤌", reward: [300, 800]   },
  { name: "shoplifting",     emoji: "🛍️", reward: [500, 1200]  },
  { name: "car theft",       emoji: "🚗", reward: [1000, 2500] },
  { name: "bank fraud",      emoji: "🏦", reward: [2000, 5000] },
  { name: "hacking",         emoji: "💻", reward: [1500, 4000] },
];

function fmt(n) {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

export default {
  name: "crime",
  description: "Commit a crime — high risk, high reward (20-min cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".crime",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 20 * 60 * 1000;
    const jid      = msg.key.remoteJid;

    if (now - (user.lastCrime || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastCrime);
      const minutes   = Math.floor(remaining / (60 * 1000));
      
      const limitCaption = `⏳ You're still laying low! Police are watching, next attempt available in ${minutes}m.`;

      return sock.sendMessage(jid, { text: limitCaption }, { quoted: msg });
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
      
      const claimCaption = `🎉 You committed ${crime.emoji} *${crime.name}* and pulled it off! You gained 💰 ${fmt(reward)} coins. Your new balance is 💰 ${fmt(user.money)} coins.`;

      await sock.sendMessage(jid, { text: claimCaption }, { quoted: msg });
    } else {
      const fine  = Math.floor(reward * 0.5);
      user.money  = Math.max(0, user.money - fine);
      await saveUser(sender, user);
      await jailUser(sender, 10 * 60 * 1000);
      await addHistory(sender, "crime", -fine, `Crime caught: ${crime.name} — fined & jailed 10m`);
      
      const failCaption = `🚨 BUSTED! You got caught attempting ${crime.emoji} *${crime.name}*! You were fined 💸 ${fmt(fine)} coins and jailed for 🔒 10 minutes. Your new balance is 💰 ${fmt(user.money)} coins.`;

      await sock.sendMessage(jid, { text: failCaption }, { quoted: msg });
    }
  }
};

```
