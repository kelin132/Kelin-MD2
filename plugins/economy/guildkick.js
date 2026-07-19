import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "guildkick",
  description: "Remove a member from your guild",
  category: "guild",
  usage: ".guildkick <guild_name> @user",
  aliases: ["gkick"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildkick <guild_name> @user*"
      }, { quoted: msg });
    }

    const guildName = args[0];
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild "${guildName}" not found.`
      }, { quoted: msg });
    }

    if (guild.owner !== sender) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Only the guild owner can kick members."
      }, { quoted: msg });
    }

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!targetJid) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Please mention a user to kick: *.guildkick " + guildName + " @user*"
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ You can't kick yourself!"
      }, { quoted: msg });
    }

    const success = await guildSystem.removeMember(guildName, targetJid);

    if (success) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: `✅ @${targetJid.split("@")[0]} has been removed from *${guildName}*!`,
        mentions: [targetJid]
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ That user is not a member of this guild."
      }, { quoted: msg });
    }
  }
};
