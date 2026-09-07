import {
  BUMP_CHANNEL_ID,
  findBumpiesRole,
  recordBump,
} from "../../lib/discordBump.mjs";

export default {
  name: "bump",
  aliases: ["serverbump"],
  category: "group",
  description: "Record a server bump and remind the bumpies role in two hours",
  usage: "/bump",
  cooldown: 10,

  async run({ sock, msg, sender, discord }) {
    const discordMessage = discord?.message;
    if (!discordMessage?.guild) {
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: "❌ This command is available in the Discord server only." },
        { quoted: msg },
      );
    }

    if (discordMessage.channelId !== BUMP_CHANNEL_ID) {
      return discordMessage.reply(
        `❌ Please use this command in <#${BUMP_CHANNEL_ID}>.`,
      );
    }

    const dueAt = await recordBump({
      guildId: discordMessage.guild.id,
      channelId: discordMessage.channelId,
      userId: discordMessage.author.id,
      userName:
        discordMessage.member?.displayName ||
        discordMessage.author.globalName ||
        discordMessage.author.username,
    });
    const unix = Math.floor(dueAt.getTime() / 1000);
    const role = await findBumpiesRole(discordMessage.guild);
    return discordMessage.reply(role
      ? `✅ Bump recorded! <@&${role.id}> will be reminded <t:${unix}:R>.`
      : `✅ Bump recorded! The **bumpies** role will be reminded <t:${unix}:R>.`);
  },
};