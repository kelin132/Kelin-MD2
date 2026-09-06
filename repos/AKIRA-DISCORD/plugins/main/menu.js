import { getPlugins } from "../../lib/pluginManager.mjs";
import { groupSettings } from "../../lib/groupSettings.js";
import { getRuntimeSettings } from "../../lib/runtimeSettings.mjs";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

const READMORE = "\u200B".repeat(4000);
const discordMenuSessions = new Map();

const categoryEmojis = {
  main: "🏡", economy: "💰", guild: "⚔️", naruto: "🪾", dragonball: "🐉",
  pokemon: "🎮", cards: "🃏", pets: "🐾", anime: "🍡", staff: "🛡️",
  company: "🏢", games: "🎲", fun: "🎀", ai: "🪄", search: "🔎",
  image: "🎨", utilities: "🔧", download: "📥", group: "🌸", admin: "⚜️",
  owner: "👑",
};

const categoryTitles = {
  main: "MAIN",
  economy: "ECONOMY",
  guild: "GUILD",
  pets: "PETS",
  cards: "CARDS",
  pokemon: "POKEMON",
  dragonball: "DRAGON BALL",
  games: "GAMES",
  fun: "FUN",
  ai: "AI",
  search: "SEARCH",
  image: "IMAGE",
  utilities: "UTILITIES",
  download: "DOWNLOAD",
  group: "GROUP",
  anime: "ANIME",
  staff: "STAFF",
  owner: "OWNER",
  company: "COMPANY",
  naruto: "NARUTO",
  media: "MEDIA",
  admin: "ADMIN",
};

const PUBLIC_CATS = new Set([
  "main", "economy", "company", "guild", "games", "fun", "ai", "search",
  "media", "utilities", "download", "group", "anime", "cards",
  "naruto", "pokemon", "pets", "image", "dragonball",
]);

function normalizeCategory(value = "") {
  const normalized = String(value).trim().toLowerCase().replace(/é/g, "e");
  return normalized === "poke" ? "pokemon" : normalized;
}

function renderCategory(emoji, title, disabledTag, plugins, menuPrefix) {
  const commandLines = plugins
    .map((plugin) => `│ ꕥ *${menuPrefix}${plugin.name}*`)
    .join("\n");

  const heading = disabledTag ? `*${title}*${disabledTag}` : `*${title}*`;
  return `\n╭─${emoji} 「 ${heading} 」\n│\n${commandLines}\n╰━━━━━━━━━━━━━━━━━━━━`;
}

function renderDiscordCategory(emoji, title, disabledTag, plugins, menuPrefix) {
  const entries = plugins.map((plugin) => {
    const aliases = Array.isArray(plugin.aliases)
      ? plugin.aliases.filter((alias) => alias && alias !== plugin.name).slice(0, 5)
      : [];
    const usage = plugin.usage
      ? String(plugin.usage).replace(/\./g, menuPrefix)
      : `${menuPrefix}${plugin.name}`;
    const aliasLine = aliases.length
      ? `\`${aliases.map((alias) => `${menuPrefix}${alias}`).join("`  `")}\``
      : `\`${usage}\``;
    return `**${plugin.name}**\n${aliasLine}\n${plugin.description || "No description available."}`;
  });

  return `**${emoji} ${title}${disabledTag}**\n\n${entries.join("\n\n")}`;
}

function chunkForDiscord(text, maxLength = 1900) {
  const chunks = [];
  let current = "";

  for (const line of String(text).split("\n")) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) chunks.push(current);
    if (line.length <= maxLength) {
      current = line;
      continue;
    }

    for (let start = 0; start < line.length; start += maxLength) {
      const piece = line.slice(start, start + maxLength);
      if (piece.length === maxLength) chunks.push(piece);
      else current = piece;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [""];
}

function menuBrowseButton(token) {
  return new ButtonBuilder()
    .setCustomId(`menu:${token}:browse`)
    .setLabel("Browse categories")
    .setStyle(ButtonStyle.Primary);
}

function menuOverviewComponents(token) {
  return [
    new ActionRowBuilder().addComponents(menuBrowseButton(token)),
  ];
}

function menuCategoryComponents(token, categories) {
  const rows = [];
  for (let index = 0; index < categories.length; index += 5) {
    const row = new ActionRowBuilder();
    for (const category of categories.slice(index, index + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`menu:${token}:category:${category}`)
          .setLabel(categoryTitles[category] || category.toUpperCase())
          .setEmoji(categoryEmojis[category] || "📌")
          .setStyle(ButtonStyle.Secondary),
      );
    }
    rows.push(row);
  }

  const backButton = new ButtonBuilder()
    .setCustomId(`menu:${token}:back`)
    .setLabel("↩ Back to menu")
    .setStyle(ButtonStyle.Secondary);
  if (rows.length < 5) {
    rows.push(new ActionRowBuilder().addComponents(backButton));
  } else if (rows.at(-1).components.length < 5) {
    rows.at(-1).addComponents(backButton);
  }
  return rows;
}

function menuNavigationComponents(token, session) {
  const { categoryIndex, categories } = session;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`menu:${token}:previous`)
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(categoryIndex <= -1),
      new ButtonBuilder()
        .setCustomId(`menu:${token}:next`)
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(categoryIndex === categories.length - 1),
      menuBrowseButton(token),
    ),
  ];
}

function discordMenuPayload(token, session) {
  const {
    categories,
    categoryTexts,
    categorySummaries,
    categoryIndex,
    runtime,
    mention,
    userAvatar,
  } = session;
  const category = categoryIndex >= 0 ? categories[categoryIndex] : null;
  const title = category ? (categoryTitles[category] || category.toUpperCase()) : "OVERVIEW";
  const footerLabel = categoryIndex < 0
    ? `Overview • ${categories.length} categories`
    : `Category ${categoryIndex + 1}/${categories.length} • ${title}`;
  const pageDescription = categoryIndex < 0
    ? "Use **Browse categories** below to choose a command group."
    : categoryTexts.get(category)?.[0] || "No commands are available in this category.";
  const totalCommands = categorySummaries.reduce((total, item) => total + item.count, 0);
  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle(`Hello ${mention}, I'm ${runtime.botName}`)
    .setDescription(pageDescription)
    .setImage(runtime.botImage)
    .addFields(
      { name: "Prefix", value: `\`${runtime.prefix}\``, inline: true },
      { name: "Commands", value: String(totalCommands), inline: true },
    )
    .setFooter({
      text: `${footerLabel} • Use the buttons to switch categories`,
    });
  if (categoryIndex < 0) {
    embed.addFields(categorySummaries.map((item) => ({
      name: `${item.emoji} ${item.title}`,
      value: item.preview || `${item.count} command${item.count === 1 ? "" : "s"}`,
      inline: true,
    })).slice(0, 25));
  }
  if (userAvatar) embed.setThumbnail(userAvatar);
  const embeds = [embed];
  if (categoryIndex >= 0) {
    for (const chunk of (categoryTexts.get(category) || []).slice(1, 10)) {
      embeds.push(new EmbedBuilder().setColor("#0099ff").setDescription(chunk));
    }
  }
  const components = session.view === "categories"
    ? menuCategoryComponents(token, categories)
    : categoryIndex >= 0
      ? menuNavigationComponents(token, session)
      : menuOverviewComponents(token);
  return {
    content: mention,
    allowedMentions: { users: [session.userId] },
    embeds,
    components,
  };
}

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu [category]  — e.g. .menu pokemon",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod, sender, args, discord }) {
    const jid = msg.key.remoteJid;
    const allPlugins = getPlugins();
    const isGroup = jid?.endsWith("@g.us");
    const senderNum = sender.split("@")[0].split(":")[0];
    const gs = isGroup ? (groupSettings.get(jid) || {}) : {};
    const disabledCats = new Set(gs.disabledCategories || []);
    const runtime = getRuntimeSettings();
    const menuPrefix = runtime.prefix || prefix;
    const requestedCategory = normalizeCategory(args?.[0] || "");
    const isDiscord = Boolean(discord?.message);
    const mention = isDiscord
      ? `<@${discord.message.author.id}>`
      : `@${senderNum}`;

    const map = new Map();
    for (const plugin of allPlugins) {
      if (plugin.hidden) continue;
      const cat = plugin.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(plugin);
    }

    const showStaff = isOwner || isStaff || isMod;
    const order = [
      "main", "economy", "company", "guild", "pets", "cards", "naruto",
      "pokemon", "dragonball", "games", "fun", "ai", "search", "media",
      "image", "utilities", "download", "group", "admin", "anime",
      ...(showStaff ? ["staff"] : []),
      ...(showStaff ? ["owner"] : []),
    ];
    const sortedCats = [
      ...order.filter((cat) => map.has(cat)),
      ...[...map.keys()].filter((cat) => !order.includes(cat) && PUBLIC_CATS.has(cat)).sort(),
    ];

    if (requestedCategory && !sortedCats.includes(requestedCategory)) {
      return sock.sendMessage(jid, {
        text: `❌ That category is unavailable here.\n\nTry *.menu pokemon* to open the Pokémon command guide.`,
      }, { quoted: msg });
    }

    const visibleCats = requestedCategory ? [requestedCategory] : sortedCats;
    let text = requestedCategory
      ? `*MENU*\n${isDiscord ? "" : `\n${READMORE}\n`}`
      : `*Hello ${mention}, I am ${runtime.botName}* 👋
\n${isDiscord ? "" : `${READMORE}\n`}`;

    for (const cat of visibleCats) {
      const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;
      if (isCatDisabled) continue;
      const emoji = categoryEmojis[cat] || "📌";
      const title = categoryTitles[cat] || cat.toUpperCase();
      const disabledTag = isGroup && disabledCats.has(cat) && showStaff ? " _(disabled)_" : "";
      const categoryPlugins = [...map.get(cat)].sort((a, b) => a.name.localeCompare(b.name));
      if (requestedCategory) {
        text += renderCategory(emoji, title, disabledTag, categoryPlugins, menuPrefix);
        text += `\n\n🌟 _Use *.menu* to return to the full command atlas._`;
      } else {
        text += renderCategory(emoji, title, disabledTag, categoryPlugins, menuPrefix);
      }
    }

    if (isGroup && !showStaff && disabledCats.size > 0) {
      text += `\n\n🔒 *Disabled in this group:* ${[...disabledCats].join(", ")}\n_Ask a staff member to enable them._`;
    }

    if (isDiscord) {
      const token = `${discord.message.author.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const categoryTexts = new Map();
      const categorySummaries = [];
      for (const cat of sortedCats) {
        const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;
        if (isCatDisabled) continue;
        const emoji = categoryEmojis[cat] || "📌";
        const title = categoryTitles[cat] || cat.toUpperCase();
        const disabledTag = isGroup && disabledCats.has(cat) && showStaff ? " _(disabled)_" : "";
        const categoryPlugins = [...map.get(cat)].sort((a, b) => a.name.localeCompare(b.name));
        const categoryText = renderDiscordCategory(emoji, title, disabledTag, categoryPlugins, menuPrefix);
        categoryTexts.set(cat, chunkForDiscord(categoryText, 3800));
        const commandPreview = categoryPlugins
          .map((plugin) => `\`${menuPrefix}${plugin.name}\``)
          .join("  ");
        categorySummaries.push({
          emoji,
          title,
          count: categoryPlugins.length,
          preview: commandPreview.length > 1024
            ? `${commandPreview.slice(0, 1010)}…`
            : commandPreview,
        });
      }

      const categories = [...categoryTexts.keys()];
      const session = {
        userId: discord.message.author.id,
        categories,
        categoryTexts,
        categorySummaries,
        categoryIndex: requestedCategory ? Math.max(0, categories.indexOf(requestedCategory)) : -1,
        view: requestedCategory ? "category" : "overview",
        runtime,
        mention,
        userAvatar: discord.message.author.displayAvatarURL?.({
          extension: "png",
          size: 128,
          forceStatic: true,
        }),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      discordMenuSessions.set(token, session);
      setTimeout(() => discordMenuSessions.delete(token), 10 * 60 * 1000).unref?.();
      await discord.message.reply(discordMenuPayload(token, session));
      return;
    }

    return sock.sendMessage(jid, {
      image: { url: runtime.botImage },
      caption: text,
      mentions: [sender],
    }, { quoted: msg });
  },

  async onDiscordInteraction({ interaction }) {
    const parts = String(interaction.customId || "").split(":");
    if (parts.length < 3 || parts[0] !== "menu") return;

    const session = discordMenuSessions.get(parts[1]);
    if (!session || session.expiresAt <= Date.now()) {
      discordMenuSessions.delete(parts[1]);
      return interaction.reply({ content: "❌ This menu has expired. Send `.menu` again.", ephemeral: true });
    }
    if (interaction.user.id !== session.userId) {
      return interaction.reply({ content: "❌ This menu belongs to another user. Send `.menu` to open your own.", ephemeral: true });
    }

    if (parts[2] === "previous" || parts[2] === "next") {
      const direction = parts[2] === "next" ? 1 : -1;
      session.view = "category";
      session.categoryIndex = Math.max(
        -1,
        Math.min(
          session.categories.length - 1,
          session.categoryIndex + direction,
        ),
      );
      return interaction.update(discordMenuPayload(parts[1], session));
    }

    if (parts[2] === "browse") {
      session.view = "categories";
      session.categoryIndex = -1;
      return interaction.update(discordMenuPayload(parts[1], session));
    }

    if (parts[2] === "back") {
      session.view = "overview";
      session.categoryIndex = -1;
      return interaction.update(discordMenuPayload(parts[1], session));
    }

    if (parts[2] === "category") {
      const category = normalizeCategory(parts.slice(3).join(":"));
      const categoryIndex = session.categories.indexOf(category);
      if (categoryIndex < 0) {
        return interaction.reply({ content: "❌ That category is no longer available.", ephemeral: true });
      }
      session.view = "category";
      session.categoryIndex = categoryIndex;
      return interaction.update(discordMenuPayload(parts[1], session));
    }
  },
};