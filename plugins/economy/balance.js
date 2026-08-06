import { getUser, requireRegistration } from "./database.js";
import { getLevelRoleLabel } from "../../lib/levelRoles.mjs";
import { generateBalanceImage } from "../../lib/economyCanvas.mjs";

function fmt(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtXP(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default {
  name: "balance",
  description: "Check your wallet and bank balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "money", "wallet"],
  cooldown: 6,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const tag  = sender.split("@")[0].split(":")[0];
    const role = getLevelRoleLabel(user.level ?? 1);
    const jid  = msg.key.remoteJid;
    const net  = (user.money ?? 0) + (user.bank ?? 0);

    const caption =
`╭─❀「 💰 *𝐖𝐀𝐋𝐋𝐄𝐓* 」❀─╮
│ 👤 *User*    :: *@${tag}*
│ 💎 *Net Worth*:: *${fmt(net)}*
│
│ 💰 *Cash*    :: *${fmt(user.money ?? 0)}*
│ 🏦 *Bank*    :: *${fmt(user.bank  ?? 0)}*
│ 💎 *Gems*    :: *${user.diamonds ?? 0} gems*
│
│ ⭐ *Level*   :: *${user.level ?? 1}*
│ 🔮 *XP*      :: *${fmtXP(user.xp ?? 0)}*
│ 🎭 *Role*    :: *${role}*
│
│ 📊 Use *.ebal* for full account breakdown
╰───────────────❀`;

    try {
      const imgBuffer = await generateBalanceImage({
        tag,
        cash:     user.money    ?? 0,
        bank:     user.bank     ?? 0,
        diamonds: user.diamonds ?? 0,
        level:    user.level    ?? 1,
        xp:       user.xp      ?? 0,
        role,
      });
      await sock.sendMessage(jid, { image: imgBuffer, caption, mentions: [sender] }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption, mentions: [sender] }, { quoted: msg });
    }
  },
};
