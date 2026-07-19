import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "allguilds",
  description: "List all existing guilds",
  category: "guild",
  usage: ".allguilds",
  aliases: ["guildslist", "guildlist"],
  cooldown: 5,

  async run({ sock, msg }) {
    const guilds = await guildSystem.getAllGuilds();

    if (!guilds || guilds.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "⚔️ No guilds exist yet!\n\nCreate the first one with *.createguild <name>*"
      }, { quoted: msg });
    }

    const sorted = guilds.sort((a, b) => b.level - a.level || b.treasury - a.treasury);

    let text = `⚔️ *ALL GUILDS* (${guilds.length} total)\n\n`;
    sorted.forEach((g, i) => {
      text += `${i + 1}. *${g.name}*\n`;
      text += `   ⭐ Level: ${g.level}  👥 Members: ${g.members.length}  💰 Treasury: $${g.treasury.toLocaleString()}\n\n`;
    });

    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
  }
};
