import { getUser, saveUser, requireRegistration, checkLevelUp } from "./database.js";

function fmt(n) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
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

    if (now - (user.lastDaily || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);
      const hours     = Math.floor(remaining / (60 * 60 * 1000));
      const minutes   = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return sock.sendMessage(jid, {
        text:
`╭─❀「 🌟 *𝐃𝐀𝐈𝐋𝐘* 」❀─╮
│ 🌙 *Result*  :: *ALREADY CLAIMED 🔴*
│ 🍃 *Flavour* :: _すでに受け取り済み！_
│
│ 🕐 *Next*    :: *${hours}h ${minutes}m*
│
│  >  More daily rewards can be claimed on the website 
╰───────────────❀`
      }, { quoted: msg });
    }

    const reward   = 50000 + Math.floor(Math.random() * 50000);
    const xpBonus  = 200;
    user.money    += reward;
    user.lastDaily = now;
    user.xp        = (user.xp || 0) + xpBonus;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);

    const caption =
`╭─❀「 🌟 *𝐃𝐀𝐈𝐋𝐘* 」❀─╮
│ 🌙 *Result*  :: *CLAIMED 🟢*
│ 🍃 *Flavour* :: _今日も頑張ろう！_
│
│ 💰 *Reward*  :: *+${fmt(reward)}*
│ 🔮 *XP*      :: *+${xpBonus}*
│ 💰 *Wallet*  :: *${fmt(user.money)}*
│ 
│ ⭐ *Level ${user.level}*  🔥 *Streak active!*${leveled ? `\n│\n│ 🎉 *LEVEL UP!* — Now Level ${user.level}` : ""}
╰───────────────❀`;

    await sock.sendMessage(jid, { text: caption }, { quoted: msg });
  },
};
