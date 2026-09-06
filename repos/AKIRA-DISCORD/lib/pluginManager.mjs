import { readdirSync, statSync, existsSync } from "fs";
import path from "path";
import { log } from "./logger.mjs";
import { getPermissions } from "./permissions.mjs";
import { ensureDb } from "./mongo.mjs";
import { discordAccountKey } from "./identity.mjs";
import { resolveDiscordAccount } from "./accountLink.mjs";
import { isDiscordSupported } from "./discordSupport.mjs";
import { akiraHandler } from "./akiraHandler.mjs";
import { isMediaContent, toDiscordPayload } from "./discordPayload.mjs";
import { buildEconomyLinkPreview, getEconomyPreviewConfig } from "./economyPreview.mjs";
import {
  AIDORU_FOOTER,
  discordAccentColor,
} from "./discordTheme.mjs";

const PLUGINS_DIR = path.resolve("plugins");
export const SUPPORT_FILE_RE = /^(?:_.*|database|db|parseAmount|balanceFormat|bettingLimits|walletMessage|autoSpawn|pokeautospawn|dbzautospawn|.*Handler)\.js$/i;
let plugins = [];
let commands = [];
const afkUsers = new Map();

// Compatibility exports for the reused WhatsApp support modules that can be
// imported while the Discord plugin directory is scanned. Discord itself
// does not use the WhatsApp router, but keeping this small contract prevents
// those shared modules from failing at import time.
export function getAfkUser(jid) {
  return afkUsers.get(jid) || null;
}

export function setAfkUser(jid, data) {
  afkUsers.set(jid, data);
}

export function deleteAfkUser(jid) {
  afkUsers.delete(jid);
}

export async function routeMessage() {
  return false;
}

export async function loadPlugins(prefix = ".") {
  plugins = [];
  commands = [];

  if (!existsSync(PLUGINS_DIR)) {
    log("warn", "No plugins/ directory found.");
    return { totalPlugins: 0, totalCommands: 0 };
  }

  const categories = readdirSync(PLUGINS_DIR)
    .filter((entry) => statSync(path.join(PLUGINS_DIR, entry)).isDirectory())
    .sort();

  for (const category of categories) {
    const categoryDir = path.join(PLUGINS_DIR, category);
    const files = readdirSync(categoryDir)
      .filter((file) => file.endsWith(".js"))
      .filter((file) => !SUPPORT_FILE_RE.test(file))
      .sort();

    for (const file of files) {
      try {
        const modulePath = path.join(categoryDir, file);
        const imported = await import(`${modulePath}?v=${Date.now()}`);
        const plugin = imported.default;
        if (!plugin?.name || typeof plugin.run !== "function") {
          log("warn", `Skipping invalid plugin ${category}/${file}`);
          continue;
        }
        if (!isDiscordSupported(plugin)) continue;

        const normalized = {
          ...plugin,
          name: String(plugin.name).toLowerCase(),
          aliases: (plugin.aliases ?? []).map((alias) => String(alias).toLowerCase()),
          category,
          prefix,
        };
        plugins.push(normalized);
      } catch (error) {
        log("warn", `Failed to load plugin ${category}/${file}: ${error.message}`);
      }
    }
  }

  const canonicalOwners = new Map();
  let duplicateCommandCount = 0;
  plugins = plugins.filter((plugin) => {
    if (canonicalOwners.has(plugin.name)) {
      duplicateCommandCount += 1;
      return false;
    }
    canonicalOwners.set(plugin.name, plugin.category);
    return true;
  });
  const canonicalNames = new Set(plugins.map((plugin) => plugin.name));
  const aliasOwners = new Map();
  let duplicateAliasCount = 0;
  plugins = plugins.map((plugin) => ({
    ...plugin,
    aliases: plugin.aliases.filter((alias) => {
      if (canonicalNames.has(alias)) {
        duplicateAliasCount += 1;
        return false;
      }
      if (aliasOwners.has(alias)) {
        duplicateAliasCount += 1;
        return false;
      }
      aliasOwners.set(alias, plugin.name);
      return true;
    }),
  }));
  commands = plugins.flatMap((plugin) => [plugin.name, ...plugin.aliases]);

  if (duplicateCommandCount || duplicateAliasCount) {
    log(
      "info",
      `Skipped ${duplicateCommandCount} duplicate command${duplicateCommandCount === 1 ? "" : "s"} and ` +
      `${duplicateAliasCount} duplicate alias${duplicateAliasCount === 1 ? "" : "es"} during startup.`,
    );
  }
  log("info", `Loaded ${plugins.length} plugins from ${categories.length} categories`);
  return { totalPlugins: plugins.length, totalCommands: commands.length };
}

async function resolveChannel(client, id, fallbackChannel) {
  if (!id || id === fallbackChannel?.id) return fallbackChannel;

  const rawId = String(id);
  if (rawId.startsWith("discord:") && rawId.endsWith("@g.us")) {
    return fallbackChannel;
  }
  const discordId = rawId.startsWith("discord:") ? rawId.slice("discord:".length) : rawId;

  try {
    return await client.channels.fetch(discordId);
  } catch {
    try {
      const user = await client.users.fetch(discordId);
      return await user.createDM();
    } catch {
      return fallbackChannel;
    }
  }
}

function discordGroupJid(guildId, channelId = "") {
  return `discord:${guildId}${channelId ? `:${channelId}` : ""}@g.us`;
}

function discordMemberId(value) {
  const raw = String(value || "");
  if (raw.startsWith("discord:")) return raw.slice("discord:".length).split("@")[0];
  return raw.split("@")[0];
}

function discordParticipant(member, guild) {
  const isOwner = member.id === guild.ownerId;
  const isAdmin = isOwner || member.permissions?.has?.("Administrator");
  return {
    id: member.id,
    admin: isOwner ? "superadmin" : isAdmin ? "admin" : undefined,
  };
}

function discordMembers(guild) {
  return [...(guild?.members?.cache?.values?.() || [])];
}

async function discordGroupMetadata(guild, chatId) {
  const members = discordMembers(guild);
  return {
    id: chatId || discordGroupJid(guild.id),
    subject: guild.name,
    desc: guild.description || "",
    owner: guild.ownerId ? `${guild.ownerId}@s.whatsapp.net` : null,
    creation: guild.createdTimestamp ? Math.floor(guild.createdTimestamp / 1000) : null,
    participants: members.map((member) => discordParticipant(member, guild)),
    restrict: false,
    announce: false,
  };
}

function discordGroupSocket(client, message, fallbackChannel) {
  if (!message.guild) return {};

  const guild = message.guild;
  return {
    groupMetadata: async (chatId) => discordGroupMetadata(guild, chatId),
    groupSettingUpdate: async (_chatId, setting) => {
      const isMute = setting === "announcement";
      await fallbackChannel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: !isMute },
        { reason: `AKIRA ${isMute ? "mute" : "unmute"} command` },
      );
    },
    groupParticipantsUpdate: async (_chatId, participantIds, action) => {
      if (action !== "remove") {
        throw new Error(`Discord does not support group participant action: ${action}`);
      }

      for (const participantId of participantIds || []) {
        const member = await guild.members.fetch(discordMemberId(participantId));
        await member.kick("AKIRA group moderation command");
      }
      return [];
    },
  };
}

function compatibilityMessage(message) {
  const isDiscordGroup = Boolean(message.guild);
  const mentionedJid = [...(message.mentions?.users?.keys?.() || [])]
    .map((userId) => discordAccountKey(userId));
  return Object.assign(message, {
    isGroup: isDiscordGroup,
    guildId: message.guildId || message.guild?.id,
    channelId: message.channelId,
    discordChannelId: message.channelId,
    pushName: message.member?.displayName || message.author?.globalName || message.author?.username,
    message: {
      extendedTextMessage: {
        contextInfo: { mentionedJid },
      },
    },
    key: {
      ...(message.key || {}),
      remoteJid: isDiscordGroup
        ? discordGroupJid(message.guild.id, message.channelId)
        : message.channelId,
      participant: discordAccountKey(message.author?.id),
    },
  });
}

function discordMentionId(value, rawSender, sender) {
  const raw = String(value || "");
  if (
    raw === String(sender || "") ||
    raw === String(rawSender || "") ||
    raw === `discord:${rawSender}`
  ) {
    return String(rawSender || "");
  }
  if (raw.startsWith("discord:")) return raw.slice("discord:".length);
  if (/^\d{5,}$/.test(raw)) return raw;
  return "";
}

function prepareDiscordPayload(content, rawSender, sender) {
  if (!content || typeof content !== "object") return content;

  const mentions = Array.isArray(content.mentions) ? content.mentions : [];
  const replacements = new Map();
  const normalizedMentions = mentions.map((mention) => {
    const id = discordMentionId(mention, rawSender, sender);
    if (!id) return mention;

    replacements.set(`@${id}`, `<@${id}>`);
    replacements.set(`@discord:${id}`, `<@${id}>`);
    const mentionText = String(mention);
    if (mentionText.includes("@")) {
      replacements.set(`@${mentionText.split("@")[0]}`, `<@${id}>`);
    }
    return `discord:${id}`;
  });

  if (!replacements.size) return content;

  const replaceMentions = (value) => {
    let output = String(value ?? "");
    for (const [from, to] of [...replacements.entries()].sort(
      ([left], [right]) => right.length - left.length,
    )) {
      output = output.split(from).join(to);
    }
    return output;
  };

  const prepared = { ...content, mentions: normalizedMentions };
  for (const key of ["text", "caption"]) {
    if (typeof prepared[key] === "string") prepared[key] = replaceMentions(prepared[key]);
  }
  if (prepared.discordEmbed && typeof prepared.discordEmbed === "object") {
    prepared.discordEmbed = {
      ...prepared.discordEmbed,
      ...(typeof prepared.discordEmbed.description === "string"
        ? { description: replaceMentions(prepared.discordEmbed.description) }
        : {}),
      ...(Array.isArray(prepared.discordEmbed.fields)
        ? {
            fields: prepared.discordEmbed.fields.map((field) => ({
              ...field,
              ...(typeof field.name === "string" ? { name: replaceMentions(field.name) } : {}),
              ...(typeof field.value === "string" ? { value: replaceMentions(field.value) } : {}),
            })),
          }
        : {}),
    };
  }
  return prepared;
}

export async function routeDiscordMessage(client, message, prefix = ".", ownerId = "") {
  if (!message || message.author?.bot) return;

  if (!message.content?.startsWith(prefix)) {
    // Check if Akira should respond to this non-command message
    return await akiraHandler({ client, message, prefix });
  }

  const body = message.content.slice(prefix.length).trim();
  if (!body) return;

  const [rawCommand, ...rawArgs] = body.split(/\s+/);
  const command = rawCommand.toLowerCase();
  const args = rawArgs;
  const text = rawArgs.join(" ");
  const rawSender = String(message.author.id);
  const linkedAccount = await resolveDiscordAccount(rawSender).catch(() => null);
  const sender = linkedAccount || discordAccountKey(rawSender);

  try {
    await ensureDb();
    const permissions = await getPermissions(sender, ownerId, {
      discordId: rawSender,
      linkedAccount: Boolean(linkedAccount),
    });
    const { isOwner, isStaff, isMod, isPremium, isJailed, isBanned } = permissions;

    if (isBanned && !isOwner) {
      await message.reply("🚫 You are banned from using this bot.");
      return;
    }

    const plugin = plugins.find(
      (entry) => entry.name === command,
    ) || plugins.find(
      (entry) => entry.aliases.includes(command),
    );
    if (!plugin) return;

    if (plugin.isOwner && !isOwner) {
      await message.reply("❌ Owner only command.");
      return;
    }
    if (plugin.isStaff && !isStaff && !isOwner) {
      await message.reply("❌ Staff only command.");
      return;
    }
    const discordServerAdmin =
      message.guild &&
      plugin.discordAdmin &&
      (message.member?.permissions?.has?.("ManageGuild") ||
        message.member?.permissions?.has?.("Administrator"));
    if (plugin.isMod && !isMod && !isOwner && !discordServerAdmin) {
      await message.reply("❌ Moderator only command.");
      return;
    }
    if (
      plugin.isAdmin &&
      !isOwner &&
      !message.member?.permissions?.has?.("ManageGuild") &&
      !message.member?.permissions?.has?.("Administrator")
    ) {
      await message.reply("❌ Server administrators only.");
      return;
    }

    const mockSock = {
      sendMessage: async (id, content, options = {}) => {
        const channel = await resolveChannel(client, id, message.channel);
        const discordContent = prepareDiscordPayload(content, rawSender, sender);
        if (content?.react?.text) {
          if (options.quoted?.react) {
            return options.quoted.react(content.react.text);
          }
          return null;
        }
        if (
          plugin.discordPlainText
          && discordContent
          && typeof discordContent === "object"
          && typeof discordContent.text === "string"
          && !isMediaContent(discordContent)
        ) {
          return channel.send({ content: discordContent.text });
        }
        const payload = toDiscordPayload(discordContent, {
          accentColor: discordAccentColor(plugin),
          title: plugin.discordTitle,
          command: plugin.name,
          footer: AIDORU_FOOTER,
          thumbnail: message.author?.displayAvatarURL?.({
            extension: "png",
            size: 128,
            forceStatic: true,
          }),
          embedMedia: true,
        });
        if (options.quoted && typeof options.quoted.reply === "function") {
          return options.quoted.reply(payload);
        }
        return channel.send(payload);
      },
      sendPresenceUpdate: async () => undefined,
      profilePictureUrl: async (id) => {
        const userId = String(id || "").replace(/^discord:/, "").split("@")[0];
        const user = await client.users.fetch(userId);
        return user.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });
      },
      onWhatsApp: async (id) => [{ jid: String(id || ""), exists: true }],
      contacts: Object.create(null),
      user: client.user,
      ...discordGroupSocket(client, message, message.channel),
    };

    const previewCommand = String(plugin.name || command || "").toLowerCase();
    const shouldAttachPreview = new Set(["daily", "weekly", "monthly"]).has(previewCommand);
    let previewSent = false;
    const commandSock = shouldAttachPreview
      ? new Proxy(mockSock, {
          get(target, property, receiver) {
            if (property !== "sendMessage") return Reflect.get(target, property, receiver);
            return async (id, content, options = {}) => {
              if (
                !previewSent &&
                content &&
                typeof content === "object" &&
                typeof content.text === "string" &&
                !content.linkPreview
              ) {
                const config = getEconomyPreviewConfig(previewCommand);
                const linkPreview = await buildEconomyLinkPreview(previewCommand);
                if (config && linkPreview) {
                  previewSent = true;
                  return target.sendMessage(
                    id,
                    {
                      ...content,
                      text: `${content.text}\n\n🔗 ${config.url}`,
                      linkPreview,
                    },
                    options,
                  );
                }
              }
              return target.sendMessage(id, content, options);
            };
          },
        })
      : mockSock;

    await plugin.run({
      sock: commandSock,
      msg: compatibilityMessage(message),
      args,
      text,
      cmd: command,
      sender,
      rawSender,
      prefix,
      isOwner,
      isStaff,
      isMod,
      isPremium,
      isJailed,
      discord: { client, message },
    });
  } catch (error) {
    log("error", `Command ${command} failed: ${error.stack || error.message}`);
    try {
      const detail = String(error?.message || "Unknown error")
        .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "database connection")
        .replace(/\s+/g, " ")
        .slice(0, 180);
      await message.reply(`❌ \`${command}\` failed: ${detail}`);
    } catch {
      // The channel may have disappeared; the original error is already logged.
    }
  }
}

export async function routeDiscordInteraction(client, interaction, prefix = ".", ownerId = "") {
  if (!interaction?.isButton?.()) return;

  const handler = plugins.find((plugin) =>
    typeof plugin.onDiscordInteraction === "function" &&
    String(interaction.customId || "").startsWith(`${plugin.name}:`),
  );
  if (!handler) return;

  try {
    await handler.onDiscordInteraction({
      client,
      interaction,
      prefix,
      ownerId,
    });
  } catch (error) {
    log("error", `Discord interaction failed: ${error.stack || error.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ That control could not be used.", ephemeral: true }).catch(() => {});
    }
  }
}

export function getPlugins() {
  return plugins;
}

export function getCommands() {
  return commands;
}
