// plugins/guild/guildjoin.js
// Join an existing guild by name

import { guildSystem }        from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name:        "guildjoin",
  description: "Join an existing guild by name",
  category:    "guild",
  usage:       ".guildjoin <guild_name>",
  aliases:     ["joinguild", "gjoin"],
  cooldown:    10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    if (!text?.trim()) {
      return sock.sendMessage(jid, {
        text:
          "❌ Usage: *.guildjoin <guild_name>*\n\n" +
          "Example: `.guildjoin Warriors`\n\n" +
          "Use *.allguilds* to see all available guilds.",
      }, { quoted: msg });
    }

    const guildName = text.trim();

    // Check guild exists
    const guild = await guildSystem.getGuild(guildName);
    if (!guild) {
      return sock.sendMessage(jid, {
        text:
          `❌ Guild *"${guildName}"* does not exist.\n\n` +
          "Use *.allguilds* to see all available guilds.",
      }, { quoted: msg });
    }

    // Check already a member
    if (guild.members.includes(sender)) {
      return sock.sendMessage(jid, {
        text:
          `❌ You are already a member of *${guild.name}*.\n\n` +
          "Use *.myguilds* to see all your guilds.",
      }, { quoted: msg });
    }

    // Add them
    const success = await guildSystem.addMember(guildName, sender);
    if (!success) {
      return sock.sendMessage(jid, {
        text: "❌ Failed to join guild. Please try again.",
      }, { quoted: msg });
    }

    const updated = await guildSystem.getGuild(guildName);

    return sock.sendMessage(jid, {
      text:
        `⚔️ *Welcome to ${guild.name}!*\n\n` +
        `👑 Owner: @${guild.owner.split("@")[0]}\n` +
        `⭐ Level: ${updated.level}\n` +
        `👥 Members: ${updated.members.length}\n` +
        `💰 Treasury: $${updated.treasury.toLocaleString()}\n\n` +
        `Use *.guildinfo ${guild.name}* to learn more.`,
      mentions: [guild.owner],
    }, { quoted: msg });
  },
};
