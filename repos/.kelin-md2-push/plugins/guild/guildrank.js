import { guildSystem, guildUpgradeRequirements } from "../../lib/guildSystem.js";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

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

    const text = formatAnimeLeaderboard({
      subtitle: "GUILD RANKINGS",
      rows: guilds.map((g) => {
        const requirements = guildUpgradeRequirements(g.level);
        const ready = g.guildXp >= requirements.guildXp && g.treasury >= requirements.treasury && g.members.length >= requirements.members;
        return {
          name: g.name,
          value: g.level,
          valueText: `Lv.${g.level} · XP ${Number(g.guildXp || 0).toLocaleString()} · 💰$${Number(g.treasury || 0).toLocaleString()} · 👥${g.members.length}/${requirements.memberCapacity} · 🧾${Math.round((g.taxRate || requirements.taxRate) * 100)}%${ready ? " · ✦ UPGRADE READY" : ""}`,
        };
      }),
      valueIcon: "🏰",
      valueLabel: "𝐆𝐔𝐈𝐋𝐃 𝐋𝐄𝐕𝐄𝐋",
      footer: "🌸 𝐆𝐔𝐈𝐋𝐃 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
    });
    await sock.sendMessage(jid, { text }, { quoted: msg });
  }
};
