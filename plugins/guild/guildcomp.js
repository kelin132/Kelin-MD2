import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "guildcomp",
  description: "Compare two guilds head to head",
  category: "guild",
  usage: ".guildcomp <guild1> | <guild2>",
  aliases: ["gcompare", "gvs"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text?.includes("|")) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 ⚔️ *𝐆𝐔𝐈𝐋𝐃 𝐂𝐎𝐌𝐏* 〕
│ 📖 *Usage* :: *.guildcomp <guild1> | <guild2>*
│ 💡 *Example* :: *.guildcomp Warriors | Dragons*
└───────────────◆`
      }, { quoted: msg });
    }

    const parts = text.split("|").map(s => s.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return sock.sendMessage(jid, {
        text: "❌ Usage: *.guildcomp <guild1> | <guild2>*"
      }, { quoted: msg });
    }

    const [g1, g2] = await Promise.all([
      guildSystem.getGuild(parts[0]),
      guildSystem.getGuild(parts[1]),
    ]);

    if (!g1) return sock.sendMessage(jid, { text: `❌ Guild *"${parts[0]}"* not found.` }, { quoted: msg });
    if (!g2) return sock.sendMessage(jid, { text: `❌ Guild *"${parts[1]}"* not found.` }, { quoted: msg });

    function vs(val1, val2, higher = true) {
      if (val1 === val2) return ["🟡", "🟡"];
      const winner = higher ? val1 > val2 : val1 < val2;
      return winner ? ["🟢", "🔴"] : ["🔴", "🟢"];
    }

    const [lv1, lv2]   = vs(g1.level,              g2.level);
    const [mb1, mb2]   = vs(g1.members.length,      g2.members.length);
    const [tr1, tr2]   = vs(g1.treasury,            g2.treasury);

    const overall1 = g1.level * 1000 + g1.members.length * 100 + g1.treasury / 100;
    const overall2 = g2.level * 1000 + g2.members.length * 100 + g2.treasury / 100;
    const winner   = overall1 > overall2 ? g1.name : overall2 > overall1 ? g2.name : "TIE";

    await sock.sendMessage(jid, {
      text:
`╭─〔 ⚔️ *𝐆𝐔𝐈𝐋𝐃 𝐂𝐎𝐌𝐏𝐀𝐑𝐈𝐒𝐎𝐍* 〕
│
│ ⚔️ *${g1.name}*  vs  *${g2.name}* ⚔️
│
│ 📊 *STATS*        ${g1.name.slice(0,10).padEnd(10)}  ${g2.name.slice(0,10)}
├◆ ⭐ Level       ${lv1} ${String(g1.level).padEnd(12)} ${lv2} ${g2.level}
├◆ 👥 Members     ${mb1} ${String(g1.members.length).padEnd(12)} ${mb2} ${g2.members.length}
├◆ 💰 Treasury    ${tr1} $${String(g1.treasury.toLocaleString()).padEnd(11)} ${tr2} $${g2.treasury.toLocaleString()}
│
├◆ 🏆 *Winner* :: *${winner}*
└───────────────◆`
    }, { quoted: msg });
  }
};
