import { guildSystem } from "../../lib/guildSystem.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

export default {
  name: "guildinfo",
  description: "Get information about a guild",
  category: "guild",
  usage: ".guildinfo <guild_name>",
  aliases: ["gi", "gstats"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "❌ Usage: *.guildinfo <guild_name>*"
      }, { quoted: msg });
    }

    const guild = await guildSystem.getGuild(text.trim());

    if (!guild) {
      return sock.sendMessage(jid, {
        text: `❌ Guild *"${text.trim()}"* not found.`
      }, { quoted: msg });
    }

    const created = guild.createdAt
      ? new Date(guild.createdAt).toLocaleDateString()
      : "Unknown";

    // Build image in parallel with the text reply
    const ownerPic  = await getProfilePic(sock, guild.owner);
    const ownerName = getContactName(sock, guild.owner);

    const caption =
`╭━━━〔 ⚔️ GUILD INFO 〕━━━╮

📛 Name     : ${guild.name}
👑 Owner    : ${ownerName}
👥 Members  : ${guild.members.length}
💰 Treasury : $${guild.treasury.toLocaleString()}
⭐ Level    : ${guild.level}
📅 Created  : ${created}

╰━━━━━━━━━━━━━━━━━━━━╯`;

    try {
      const imgBuffer = await generateGuildProfile(
        { name: guild.name, icon: ownerPic },
        { name: ownerName, profilePic: ownerPic }
      );

      await sock.sendMessage(jid, {
        image: imgBuffer,
        caption,
      }, { quoted: msg });
    } catch {
      // Canvas failed — fall back to text only
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  }
};
