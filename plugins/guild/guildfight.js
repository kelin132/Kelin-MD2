// plugins/guild/guildfight.js
// Guild vs Guild battle — compares combined ninja stats of top members
// Usage: .guildfight <guild_a> vs <guild_b>

import { guildSystem } from "../../lib/guildSystem.js";
import players from "../../lib/naruto/players.js";
import { requireRegistration } from "./database.js";
import { sendWithCharacterImage } from "../../lib/gifHelper.mjs";

// How many top members to include in the combined stat comparison
const TOP_N = 5;

/** Pull top N members by total combat power */
async function getTopPower(guild) {
  const memberData = await Promise.all(
    guild.members.map(jid => players.get(jid).catch(() => null))
  );

  const valid = memberData.filter(Boolean);

  return valid
    .map(p => ({
      jid:     p.jid,
      name:    p.username || p.jid.split("@")[0],
      power:   (p.attack || 0) + (p.defense || 0) + (p.speed || 0) + Math.floor(p.maxHp / 10),
      level:   p.level || 1,
    }))
    .sort((a, b) => b.power - a.power)
    .slice(0, TOP_N);
}

function powerBar(power, max, len = 10) {
  const filled = Math.round((power / max) * len);
  return "█".repeat(filled) + "░".repeat(Math.max(0, len - filled));
}

export default {
  name: "guildfight",
  description: "Pit two guilds against each other in a stat battle",
  category: "guild",
  usage: ".guildfight <guild_a> vs <guild_b>",
  aliases: ["gfight", "gvsg", "guildwar"],
  cooldown: 30,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`❌ Usage: *.guildfight <guild_a> vs <guild_b>*

Example: *.guildfight Warriors vs Shadows*`
      }, { quoted: msg });
    }

    // Parse "GuildA vs GuildB"
    const vsRegex = /^(.+?)\s+vs\s+(.+)$/i;
    const match = text.trim().match(vsRegex);

    if (!match) {
      return sock.sendMessage(jid, {
        text: `❌ Format: *.guildfight <guild_a> vs <guild_b>*\n\nExample: .guildfight Warriors vs Shadows`
      }, { quoted: msg });
    }

    const nameA = match[1].trim();
    const nameB = match[2].trim();

    if (nameA.toLowerCase() === nameB.toLowerCase()) {
      return sock.sendMessage(jid, {
        text: "❌ A guild can't fight itself!"
      }, { quoted: msg });
    }

    const [guildA, guildB] = await Promise.all([
      guildSystem.getGuild(nameA),
      guildSystem.getGuild(nameB),
    ]);

    if (!guildA) {
      return sock.sendMessage(jid, { text: `❌ Guild *"${nameA}"* not found.` }, { quoted: msg });
    }
    if (!guildB) {
      return sock.sendMessage(jid, { text: `❌ Guild *"${nameB}"* not found.` }, { quoted: msg });
    }

    if (guildA.members.length === 0 || guildB.members.length === 0) {
      return sock.sendMessage(jid, { text: "❌ Both guilds need at least 1 member with a ninja profile." }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text: `⚔️ Calculating battle power for *${nameA}* vs *${nameB}*...`
    }, { quoted: msg });

    const [topA, topB] = await Promise.all([
      getTopPower(guildA),
      getTopPower(guildB),
    ]);

    if (topA.length === 0 || topB.length === 0) {
      return sock.sendMessage(jid, {
        text: "❌ Couldn't load ninja data. Make sure both guild members have ninja profiles (*.nstart*)."
      }, { quoted: msg });
    }

    const totalA = topA.reduce((s, p) => s + p.power, 0);
    const totalB = topB.reduce((s, p) => s + p.power, 0);
    const grandMax = Math.max(totalA, totalB) || 1;

    // Add level bonus per guild level
    const bonusA = (guildA.level - 1) * 50;
    const bonusB = (guildB.level - 1) * 50;
    const finalA = totalA + bonusA;
    const finalB = totalB + bonusB;

    const winner    = finalA >= finalB ? guildA : guildB;
    const loser     = finalA >= finalB ? guildB : guildA;
    const winPower  = finalA >= finalB ? finalA : finalB;
    const losePower = finalA >= finalB ? finalB : finalA;
    const margin    = Math.abs(finalA - finalB);
    const close     = margin < grandMax * 0.1;

    // Build roster lines
    function rosterLines(top) {
      return top.map((p, i) =>
        `  ${i + 1}. ${p.name} — ⚡${p.power} (Lv ${p.level})`
      ).join("\n");
    }

    const report =
`⚔️ *GUILD BATTLE RESULT*
━━━━━━━━━━━━━━━━━━━━━━━━

🏆 *${winner.name}* WINS!${close ? " (Very close!)" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━
⚔️ *${nameA}* (Lv ${guildA.level})
${powerBar(finalA, grandMax)} ⚡${finalA}
${rosterLines(topA)}
${bonusA > 0 ? `  🏅 Guild Level Bonus: +${bonusA}` : ""}

⚔️ *${nameB}* (Lv ${guildB.level})
${powerBar(finalB, grandMax)} ⚡${finalB}
${rosterLines(topB)}
${bonusB > 0 ? `  🏅 Guild Level Bonus: +${bonusB}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━
🥇 *${winner.name}*: ⚡${winPower}
💀 *${loser.name}*: ⚡${losePower}
📊 Margin: ${margin} power${close ? " — incredibly close!" : ""}

Train your ninjas and upgrade your guild to dominate next time!
*.ntrain* | *.nmissions* | *.guildupgrade*`;

    const chars = ["Naruto Uzumaki", "Sasuke Uchiha", "Kakashi Hatake", "Minato Namikaze"];
    const char = chars[Math.floor(Math.random() * chars.length)];

    return sendWithCharacterImage(sock, jid, msg, report, char, "battle");
  }
};
