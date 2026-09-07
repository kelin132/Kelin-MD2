import {
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import {
  closeTicketChannel,
  registerTicket,
} from "../../lib/discordTickets.mjs";

function canCloseTicket(message, isOwner, isMod) {
  return Boolean(
    isOwner ||
    isMod ||
    message.member?.permissions?.has?.(PermissionFlagsBits.ManageChannels) ||
    message.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
    message.member?.permissions?.has?.(PermissionFlagsBits.Administrator),
  );
}

function ticketName(author) {
  const slug = String(
    author.globalName ||
      author.username ||
      author.id,
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || "member";
  return `ticket-${slug}`;
}

export default {
  name: "ticket",
  aliases: ["tickets"],
  category: "group",
  description: "Create a private support ticket or close one",
  usage: ".ticket | .ticket close",
  cooldown: 10,

  async run({ sock, msg, args, discord, isOwner, isMod }) {
    const discordMessage = discord?.message;
    if (!discordMessage?.guild) {
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: "❌ Tickets are available in the Discord server only." },
        { quoted: msg },
      );
    }

    const action = String(args[0] || "create").toLowerCase();
    if (action === "close") {
      if (!discordMessage.channel.name.startsWith("ticket-")) {
        return discordMessage.reply("❌ Use `ticket close` inside a ticket channel.");
      }
      if (!canCloseTicket(discordMessage, isOwner, isMod)) {
        return discordMessage.reply("❌ Only a moderator or the owner can close tickets.");
      }
      await discordMessage.reply("🔒 Closing this ticket…");
      await closeTicketChannel(discordMessage.channel.id, "Ticket closed by staff");
      return;
    }

    if (action !== "create") {
      return discordMessage.reply("Usage: `.ticket` to create or `.ticket close` to close.");
    }

    if (discordMessage.channel.name.startsWith("ticket-")) {
      return discordMessage.reply("❌ You are already inside a ticket channel.");
    }

    const existing = discordMessage.guild.channels.cache.find(
      (channel) =>
        channel.name === ticketName(discordMessage.author) &&
        channel.type === ChannelType.GuildText,
    );
    if (existing) {
      return discordMessage.reply(`❌ You already have an open ticket: <#${existing.id}>.`);
    }

    const channel = await discordMessage.guild.channels.create({
      name: ticketName(discordMessage.author),
      type: ChannelType.GuildText,
      topic: `Support ticket opened by ${discordMessage.author.id}`,
      permissionOverwrites: [
        {
          id: discordMessage.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: discordMessage.author.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: discordMessage.guild.ownerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: discordMessage.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
      reason: `Ticket opened by ${discordMessage.author.tag}`,
    });
    const closeAt = await registerTicket({
      guildId: discordMessage.guild.id,
      channelId: channel.id,
      creatorId: discordMessage.author.id,
    });
    const unix = Math.floor(closeAt.getTime() / 1000);
    await channel.send(
      `🎫 **Ticket opened for ${discordMessage.author.displayName || discordMessage.author.username}**\n` +
        `A moderator will help you here. This ticket automatically closes <t:${unix}:R>.\n` +
        "A moderator or the owner can use `ticket close` at any time.",
    );
    return discordMessage.reply(`✅ Your private ticket is ready: <#${channel.id}>.`);
  },
};