import { getUser, saveUser, requireRegistration, addHistory, checkLevelUp } from "./database.js";

function fmt(n) {
  if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export default {
  name: "monthly",
  description: "Claim your monthly reward (30-day cooldown)",
  category: "economy",
  cooldown: 6,
  usage: ".monthly",
  checkJail: true,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 30 * 24 * 60 * 60 * 1000;
    const jid      = msg.key.remoteJid;

    if (now - (user.lastMonthly || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastMonthly);
      const days  = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

      return sock.sendMessage(jid, {
        text:
`╭─❀「 📅 *𝐌𝐎𝐍𝐓𝐇𝐋𝐘* 」❀─╮
│ 🌙 *Result*  :: *ALREADY CLAIMED 🔴*
│ 🍃 *Flavour* :: _来月また会いましょう！_
│
│ ⏳ *Next*    :: *${days}d ${hours}h*
│
│ 🔥 *Come back next month!*
╰───────────────❀`
      }, { quoted: msg });
    }

    const baseReward  = 25000 + Math.floor(Math.random() * 25000);
    const premiumMult = user.isPremium ? 2 : 1;
    const reward      = Math.floor(baseReward * premiumMult);
    const xpReward    = 1000;

    user.money       += reward;
    user.lastMonthly  = now;
    user.xp           = (user.xp || 0) + xpReward;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);
    await addHistory(sender, "monthly", reward, `Monthly reward claimed`);

    // Extra: bonus item for premium
    if (user.isPremium) {
      user.inventory = user.inventory || [];
      user.inventory.push({ item: "Mystery Box", quantity: 1, ts: now });
      await saveUser(sender, user);
    }

    await sock.sendMessage(jid, {
      text:
`╭─❀「 📅 *𝐌𝐎𝐍𝐓𝐇𝐋𝐘* 」❀─╮
│ 🌙 *Result*  :: *CLAIMED 🟢*
│ 🍃 *Flavour* :: _今月もありがとう！_
│
│ 💰 *Reward*  :: *+${fmt(reward)}*${user.isPremium ? ` _(×2 premium)_` : ""}
│ 🔮 *XP*      :: *+${xpReward}*
│ 💰 *Wallet*  :: *${fmt(user.money)}*${user.isPremium ? `\n│ 🎁 *Bonus*   :: *+1 Mystery Box*` : ""}
│
│ ⭐ *Level ${user.level}*  📅 *See you next month!*${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`
    }, { quoted: msg });
  }
};
