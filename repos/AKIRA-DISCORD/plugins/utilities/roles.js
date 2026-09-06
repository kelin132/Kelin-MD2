import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
} from "discord.js";
import {
  ensureSpawnRole,
  getSpawnRoleDefinition,
} from "../../lib/discordSpawnRoles.mjs";

const ROLE_TYPES = ["card", "pokemon"];

function roleButton(type, role) {
  const definition = getSpawnRoleDefinition(type);
  return new ButtonBuilder()
    .setCustomId(`roles:${type}`)
    .setLabel(`Toggle ${definition.label}`)
    .setEmoji(definition.emoji)
    .setStyle(type === "card" ? ButtonStyle.Primary : ButtonStyle.Success)
    .setDisabled(!role?.editable);
}

function rolesEmbed(motion = "✨") {
  return new EmbedBuilder()
    .setColor("#FF4FA3")
    .setTitle(`${motion} 𝐀𝐈𝐃𝐎𝐑𝐔 𝐏𝐈𝐍𝐆 𝐑𝐎𝐋𝐄𝐒 ${motion}`)
    .setDescription([
      "**Choose the notifications you want to receive.**",
      "",
      "Press a button below to add or remove that role from yourself.",
      "You can change your choices anytime — no staff action needed.",
    ].join("\n"))
    .addFields(
      {
        name: "🃏 Card Spawn Pings",
        value: "Get notified when a new collectible card appears.",
        inline: false,
      },
      {
        name: "🌿 Pokémon Spawn Pings",
        value: "Get notified when a wild Pokémon appears.",
        inline: false,
      },
    )
    .setFooter({
      text: `${motion} Click to toggle • AIDORU · AKIRA`,
    });
}

async function getManagedMember(guild, client, userId) {
  const member = guild.members.cache.get(userId)
    || await guild.members.fetch(userId).catch(() => null);
  const me = guild.members.me
    || await guild.members.fetch(client.user.id).catch(() => null);
  return { member, me };
}

export default {
  name: "roles",
  aliases: ["pingroles", "getroles"],
  description: "Choose your AIDORU card and Pokémon spawn notification roles",
  category: "utilities",
  usage: ".roles",
  cooldown: 5,

  async run({ discord }) {
    const message = discord?.message;
    if (!message?.guild) {
      return message?.reply?.("❌ The roles panel is only available inside a Discord server.");
    }

    const { member: botMember } = await getManagedMember(
      message.guild,
      discord.client,
      discord.client.user.id,
    );
    if (!botMember?.permissions?.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply(
        "❌ I need the **Manage Roles** permission before I can create the AIDORU ping roles.",
      );
    }

    const roles = {};
    for (const type of ROLE_TYPES) {
      roles[type] = await ensureSpawnRole(message.guild, type);
    }

    const animated = discord.client.emojis.cache.find(
      (emoji) => emoji.animated && /sparkle|star|heart|cute|pink|aiko|aidoru/i.test(emoji.name || ""),
    );
    const motion = animated ? `<a:${animated.name}:${animated.id}>` : "✨";
    const row = new ActionRowBuilder().addComponents(
      ...ROLE_TYPES.map((type) => roleButton(type, roles[type])),
    );

    return message.reply({
      embeds: [rolesEmbed(motion)],
      components: [row],
    });
  },

  async onDiscordInteraction({ interaction }) {
    const type = String(interaction.customId || "").slice("roles:".length);
    if (!ROLE_TYPES.includes(type) || !interaction.guild) return;

    const definition = getRoleDefinition(type);
    const role = await ensureSpawnRole(interaction.guild, type);
    if (!role) {
      return interaction.reply({
        content: "❌ I could not find or create that notification role.",
        ephemeral: true,
      });
    }

    if (!role.editable) {
      return interaction.reply({
        content: `❌ I cannot manage **${definition.label}**. Move that role below my highest role and try again.`,
        ephemeral: true,
      });
    }

    const member = interaction.member?.roles
      ? interaction.member
      : await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: "❌ I could not load your server membership. Please try again.",
        ephemeral: true,
      });
    }

    const enabled = member.roles.cache.has(role.id);
    try {
      if (enabled) {
        await member.roles.remove(role, "User disabled an AIDORU spawn notification role");
      } else {
        await member.roles.add(role, "User enabled an AIDORU spawn notification role");
      }
      return interaction.reply({
        content: enabled
          ? `${definition.emoji} **${definition.label}** removed.`
          : `${definition.emoji} **${definition.label}** enabled — you will be pinged on new spawns.`,
        ephemeral: true,
      });
    } catch {
      return interaction.reply({
        content: `❌ I could not update **${definition.label}**. Please check my Manage Roles permission.`,
        ephemeral: true,
      });
    }
  },
};

function getRoleDefinition(type) {
  return getSpawnRoleDefinition(type) || {
    label: "spawn notification role",
    emoji: "🔔",
  };
}