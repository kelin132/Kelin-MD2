import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "guildupgrade",
  description: "Upgrade your guild level using treasury funds",
  category: "guild",
  usage: ".guildupgrade <guild_name>",
  aliases: ["gupgrade"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildupgrade <guild_name>*"
      }, { quoted: msg });
    }

    const guildName = text.trim();
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild "${guildName}" not found.`
      }, { quoted: msg });
    }

    if (guild.owner !== sender) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Only the guild owner can upgrade the guild."
      }, { quoted: msg });
    }

    const cost = guild.level * 5000;

    if (guild.treasury < cost) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ *Insufficient treasury funds!*\n\n💰 Upgrade cost : $${cost.toLocaleString()}\n🏛️ Treasury     : $${guild.treasury.toLocaleString()}\n💸 Need         : $${(cost - guild.treasury).toLocaleString()} more\n\nUse *.guildtax <guild> <amount>* to add funds.`
      }, { quoted: msg });
    }

    const upgraded = await guildSystem.upgradeGuild(guildName, sender);

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🎉 *Guild Upgraded!*\n\n⚔️ Guild    : ${guildName}\n⭐ New Level: ${upgraded.level}\n💰 Cost     : $${cost.toLocaleString()}\n🏛️ Treasury : $${upgraded.treasury.toLocaleString()}`
    }, { quoted: msg });
  }
};
