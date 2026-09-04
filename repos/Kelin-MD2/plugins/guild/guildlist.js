import { guildSystem, guildUpgradeRequirements } from "../../lib/guildSystem.js";

export default {
  name: "guildlist",
  description: "Browse all existing guilds",
  category: "guild",
  usage: ".guildlist",
  aliases: ["allguilds", "guildslist", "gl"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const guilds = await guildSystem.getAllGuilds();

    if (!guilds || guilds.length === 0) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐋𝐈𝐒𝐓* 〕
│ No guilds exist yet!
│
├◆ *.createguild <name>* — Be the first!
└───────────────◆`
      }, { quoted: msg });
    }

    const sorted = guilds.sort((a, b) => b.level - a.level || b.treasury - a.treasury);

    let lines = sorted.map((g, i) => {
      const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const requirements = guildUpgradeRequirements(g.level);
      const ready = g.guildXp >= requirements.guildXp && g.treasury >= requirements.treasury && g.members.length >= requirements.members;
      return `├◆ ${rank} *${g.name}* — Lv.${g.level} | 👥${g.members.length}/${requirements.memberCapacity} | 💰$${g.treasury.toLocaleString()} | 🧾${Math.round((g.taxRate || requirements.taxRate) * 100)}%${ready ? " | ✦ READY" : ""}`;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐋𝐈𝐒𝐓* 〕 (${guilds.length} guilds)
│
${lines}
│
├◆ *.joinguild <name>*  — Join a guild
├◆ *.guildmembers       — List member names
├◆ *.myguild <name>*    — View details
└───────────────◆`
    }, { quoted: msg });
  }
};
