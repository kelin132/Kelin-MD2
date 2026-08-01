import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "guildinvite",
  description: "Invite a user to your guild",
  category: "guild",
  usage: ".guildinvite <guild_name> @user",
  aliases: ["ginvite"],
  cooldown: 10,

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildinvite <guild_name> @user*"
      }, { quoted: msg });
    }

    const guildName = args[0];
    const guild     = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild *"${guildName}"* not found.`
      }, { quoted: msg });
    }

    if (guild.owner !== sender) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Only the guild owner can invite members."
      }, { quoted: msg });
    }

    const targetJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!targetJid) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Mention a user: *.guildinvite ${guildName} @user*`
      }, { quoted: msg });
    }

    const success = await guildSystem.addMember(guildName, targetJid);

    if (success) {
      const updated = await guildSystem.getGuild(guildName);
      await sock.sendMessage(msg.key.remoteJid, {
        text: `✅ *@${targetJid.split("@")[0]}* has joined *${guildName}*!\n\n👥 Members: ${updated.members.length}`,
        mentions: [targetJid]
      }, { quoted: msg });
    } else {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ That user is already a member or an error occurred."
      }, { quoted: msg });
    }
  }
};
