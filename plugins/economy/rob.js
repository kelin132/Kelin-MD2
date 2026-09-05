```javascript
import { getUser, saveUser, requireRegistration, isRegistered, addHistory } from "./database.js";
import { hasActiveGun } from "../../lib/economySecurity.mjs";

function fmt(n) {
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

export default {
  name: "rob",
  description: "Rob another user — 55% success rate (45-min cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".rob @user",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid = msg.key.remoteJid;

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || (args[0]?.match(/^[0-9]+$/) ? `${args[0]}@s.whatsapp.net` : null);

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text: `📖 Usage: *.rob @user*\n🎯 Rate: *55% success*\n💸 Risk: *Fine if caught*\n🔫 Gun: *Required from .shop weapons*\n⏳ Cooldown: *45 minutes*`
      }, { quoted: msg });
    }

    if (sender === targetJid) {
      return sock.sendMessage(jid, { text: "❌ You can't rob yourself!" }, { quoted: msg });
    }

    if (!await isRegistered(targetJid)) {
      return sock.sendMessage(jid, { text: "❌ That player is not registered." }, { quoted: msg });
    }

    const robber = await getUser(sender);
    const now    = Date.now();

    if (!hasActiveGun(robber, now)) {
      return sock.sendMessage(jid, {
        text: `🔫 You need an active gun to rob someone! Buy one from *.shop weapons* (remains active for 3 days).`
      }, { quoted: msg });
    }

    const cd = 45 * 60 * 1000;

    if (now - (robber.lastRob || 0) < cd) {
      const remaining = cd - (now - robber.lastRob);
      const minutes   = Math.floor(remaining / (60 * 1000));
      return sock.sendMessage(jid, {
        text: `⏳ You're still laying low from your last robbery! Police are searching, try again in ${minutes}m.`
      }, { quoted: msg });
    }

    const target = await getUser(targetJid);

    // Check staff immunity — cannot be robbed
    if (target.staffImmunity) {
      return sock.sendMessage(jid, {
        text: `🛡️ You tried to rob @${targetJid.split("@")[0]}, but they have Staff Immunity!`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    // Check rob charm
    if (target.robShieldExpiry && target.robShieldExpiry > Date.now()) {
      const minsLeft = Math.ceil((target.robShieldExpiry - Date.now()) / 60000);
      return sock.sendMessage(jid, {
        text: `🧿 You tried to rob @${targetJid.split("@")[0]}, but they are protected by a Rob Charm! (${minsLeft}m remaining)`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    if (target.money < 100) {
      return sock.sendMessage(jid, {
        text: `💸 @${targetJid.split("@")[0]} is too broke to rob (${fmt(target.money)} coins)! Minimum 100 coins needed.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    const amount  = Math.min(10000, Math.floor(Math.random() * (target.money * 0.3)) + 100);
    const success = Math.random() > 0.45;
    const tag     = `@${targetJid.split("@")[0]}`;

    robber.lastRob = now;

    if (success) {
      target.money -= amount;
      robber.money += amount;
      await saveUser(sender, robber);
      await saveUser(targetJid, target);
      await addHistory(sender,    "rob",        amount,  `Robbed ${target.name}`);
      await addHistory(targetJid, "rob_victim", -amount, `Robbed by ${robber.name}`);

      await sock.sendMessage(jid, {
        text: `🎉 You pulled off a clean robbery on ${tag} 🦹 and stole 💰 ${fmt(amount)} coins! Your new balance is 💰 ${fmt(robber.money)} coins.`,
        mentions: [targetJid],
      }, { quoted: msg });
    } else {
      const fine   = Math.floor(amount * 0.7);
      robber.money = Math.max(0, robber.money - fine);
      await saveUser(sender, robber);
      await addHistory(sender, "rob", -fine, `Rob failed — fined $${fine.toLocaleString()}`);

      await sock.sendMessage(jid, {
        text: `🚨 BUSTED! You got caught trying to rob ${tag}! You were fined 💸 ${fmt(fine)} coins. Your new balance is 💰 ${fmt(robber.money)} coins.`,
        mentions: [targetJid],
      }, { quoted: msg });
    }
  }
};

```
