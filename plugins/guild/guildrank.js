import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "guildrank",
  description: "View the guild leaderboard ranked by level and treasury",
  category: "guild",
  usage: ".guildrank",
  aliases: ["gtop", "guildtop", "guildlb"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid    = msg.key.remoteJid;
    const guilds = await guildSystem.getRankedGuilds(10);

    if (!guilds || guilds.length === 0) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏆 *𝐆𝐔𝐈𝐋𝐃 𝐑𝐀𝐍𝐊* 〕
│ No guilds to rank yet!
│
├◆ *.createguild <name>* — Start one!
└───────────────◆`
      }, { quoted: msg });
    }

    const medals = ["🥇", "🥈", "🥉"];

    const lines = guilds.map((g, i) => {
      const badge = medals[i] || `  ${i + 1}.`;
      return `├◆ ${badge} *${g.name}*\n│     Lv.${g.level} · 👥${g.members.length} · 💰$${g.treasury.toLocaleString()}`;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`╭─〔 🏆 *𝐆𝐔𝐈𝐋𝐃 𝐑𝐀𝐍𝐊𝐈𝐍𝐆𝐒* 〕
│ Top ${guilds.length} guilds ranked by Level & Treasury
│
${lines}
│
└───────────────◆`
    }, { quoted: msg });
  }
};
