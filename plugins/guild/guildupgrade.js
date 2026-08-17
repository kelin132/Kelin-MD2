import { guildSystem, guildUpgradeRequirements, guildTaxRate } from "../../lib/guildSystem.js";

function formatRequirements(guild) {
  const requirements = guildUpgradeRequirements(guild.level);
  const members = Array.isArray(guild.members) ? guild.members.length : 0;
  const guildXp = Number(guild.guildXp) || 0;
  const treasury = Number(guild.treasury) || 0;
  return [
    `🏛️ Treasury : $${treasury.toLocaleString()} / $${requirements.treasury.toLocaleString()}`,
    `⭐ Guild XP  : ${guildXp.toLocaleString()} / ${requirements.guildXp.toLocaleString()}`,
    `👥 Members   : ${members} / ${requirements.members}`,
    `🧾 Tax rate  : ${(guildTaxRate(guild.level) * 100).toFixed(0)}% at Lv.${guild.level}`,
  ].join("\n");
}

export default {
  name: "guildupgrade",
  description: "Upgrade your guild when its activity requirements are complete",
  category: "guild",
  usage: ".guildupgrade <guild_name>",
  aliases: ["gupgrade"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    if (!text) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Usage: *.guildupgrade <guild_name>*\n\nUse *.myguild* to view your guild’s progress.",
      }, { quoted: msg });
    }

    const guildName = text.trim();
    const guild = await guildSystem.getGuild(guildName);

    if (!guild) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Guild "${guildName}" not found.`,
      }, { quoted: msg });
    }

    if (guild.owner !== sender) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Only the guild owner can upgrade the guild.",
      }, { quoted: msg });
    }

    const result = await guildSystem.upgradeGuild(guildName, sender);

    if (result?.reason === "max_level") {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `✨ *${guildName} has reached the maximum guild level: Lv.${result.maxLevel}.*`,
      }, { quoted: msg });
    }

    if (result?.reason === "requirements") {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `╭─〔 🏯 *GUILD UPGRADE LOCKED* 〕\n│ ${guildName} · Lv.${guild.level}\n│\n${formatRequirements(guild)}\n│\n│ Keep working, contributing, and growing your guild.\n└───────────────◆`,
      }, { quoted: msg });
    }

    if (!result || result === "not_owner") {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ The guild could not be upgraded. Refresh *.myguild* and try again.",
      }, { quoted: msg });
    }

    const chatJid = msg.key.remoteJid;
    const ownerNumber = String(sender).split("@")[0].split(":")[0];
    const notificationText = `╭─〔 🔔 *GUILD LEVEL UP* 〕\n│\n│ ⚔️ *${guildName}* is now *Lv.${result.level}*!\n│ 👑 Upgraded by: @${ownerNumber}\n│ 🧾 New tax rate: ${(guildTaxRate(result.level) * 100).toFixed(0)}%\n│ 👥 New capacity: ${8 + Number(result.level || 1) * 2} members\n│\n│ ✦ Keep working together to unlock the next guild upgrade.\n└───────────────◆`;
    const contextInfo = { mentionedJid: [sender] };

    await sock.sendMessage(chatJid, {
      text: `╭─〔 🎉 *GUILD UPGRADED* 〕\n│\n│ ⚔️ Guild    : ${guildName}\n│ ⭐ New Level: ${result.level}\n│ 💰 Treasury : $${Number(result.treasury || 0).toLocaleString()}\n│ 🧾 New Tax  : ${(guildTaxRate(result.level) * 100).toFixed(0)}%\n│\n│ A level-up notification has been sent to the guild members.\n└───────────────◆`,
      contextInfo,
    }, { quoted: msg });

    if (!String(chatJid).endsWith("@g.us")) {
      const members = Array.isArray(result.members) ? result.members : (Array.isArray(guild.members) ? guild.members : []);
      const recipients = [...new Set(members.map((member) => String(member).trim()))]
        .filter((member) => member && member !== String(chatJid));
      await Promise.allSettled(recipients.map((recipient) => sock.sendMessage(recipient, {
        text: notificationText,
        contextInfo,
      })));
    }
  },
};
