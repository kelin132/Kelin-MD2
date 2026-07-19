import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "guildinfo",
  description: "Get information about a guild",
  category: "guild",
  usage: ".guildinfo <guild_name>",
  aliases: ["gi", "gstats"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildinfo <guild_name>*"
      }, { quoted: msg });
    }

    const guild = await guildSystem.getGuild(text.trim());

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild *"${text.trim()}"* not found.`
      }, { quoted: msg });
    }

    const created = guild.createdAt
      ? new Date(guild.createdAt).toLocaleDateString()
      : "Unknown";

    await sock.sendMessage(msg.key.remoteJid, {
      text:
`╭━━━〔 ⚔️ GUILD INFO 〕━━━╮

📛 Name     : ${guild.name}
👑 Owner    : @${guild.owner.split("@")[0]}
👥 Members  : ${guild.members.length}
💰 Treasury : $${guild.treasury.toLocaleString()}
⭐ Level    : ${guild.level}
📅 Created  : ${created}

╰━━━━━━━━━━━━━━━━━━━━╯`,
      mentions: [guild.owner]
    }, { quoted: msg });
  }
};
