import { readData } from "../../lib/store.mjs";

export default {
  name: "ginfo",
  description: "View your guild info",
  category: "guild",
  usage: ".ginfo [guild name]",
  aliases: ["guild", "myguild"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text, senderNum }) {
    const jid    = msg.key.remoteJid;
    const guilds = readData("guilds", {});

    let guild;
    if (text) {
      const id = text.trim().toLowerCase().replace(/\s+/g, "_");
      guild = guilds[id];
    } else {
      guild = Object.values(guilds).find((g) => g.members.includes(senderNum));
    }

    if (!guild) {
      return sock.sendMessage(jid, {
        text: text ? `❌ Guild not found.` : `❌ You're not in a guild.\nCreate one with *.gcreate <name>*`,
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      text: [
        `⚔️ *${guild.name}*`,
        ``,
        `👑 Leader:  +${guild.leader.slice(-6)}...`,
        `👥 Members: ${guild.members.length}`,
        `⭐ Level:   ${guild.level}`,
        `✨ XP:      ${guild.xp}`,
        `📅 Created: ${new Date(guild.created).toLocaleDateString()}`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
