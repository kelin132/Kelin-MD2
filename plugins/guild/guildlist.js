import { guildSystem } from "../../lib/guildSystem.js";

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
      return `├◆ ${rank} *${g.name}* — Lv.${g.level} | 👥${g.members.length} | 💰$${g.treasury.toLocaleString()}`;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐋𝐈𝐒𝐓* 〕 (${guilds.length} guilds)
│
${lines}
│
├◆ *.joinguild <name>*  — Join a guild
├◆ *.myguild <name>*    — View details
└───────────────◆`
    }, { quoted: msg });
  }
};
