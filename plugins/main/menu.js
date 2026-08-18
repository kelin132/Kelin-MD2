import { getPlugins } from "../../lib/pluginManager.mjs";
import { groupSettings } from "../../lib/groupSettings.js";
import { getRuntimeSettings } from "../../lib/runtimeSettings.mjs";

const READMORE = "\u200B".repeat(4000);

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

function formatUsage(usage, menuPrefix) {
  if (!usage) return "";
  return String(usage).replace(/\.(?=[a-z])/gi, menuPrefix);
}

function renderDetailedCommand(plugin, menuPrefix) {
  const command = `${menuPrefix}${plugin.name}`;
  const aliases = (plugin.aliases || [])
    .filter((alias) => alias && alias !== plugin.name)
    .map((alias) => `${menuPrefix}${alias}`);
  const aliasLine = aliases.length ? `\n│   ◇ Also: ${aliases.join("  ·  ")}` : "";
  const usage = formatUsage(plugin.usage, menuPrefix);
  const usageLine = usage ? `\n│   ↳ ${usage}` : "";
  const description = plugin.description || "Explore this command in your trainer journey.";

  return `│ ✦ *${command}*${aliasLine}\n│   ${description}${usageLine}`;
}

function renderCategory(emoji, title, disabledTag, plugins, menuPrefix, detailed = false) {
  const commandLines = plugins
    .map((plugin) => detailed
      ? renderDetailedCommand(plugin, menuPrefix)
      : `│ ꕥ *${menuPrefix}${plugin.name}*`)
    .join("\n");

  const heading = disabledTag ? `*${title}*${disabledTag}` : `*${title}*`;
  return `\n╭─${emoji} 「 ${heading} 」\n│\n${commandLines}\n╰━━━━━━━━━━━━━━━━━━━━`;
}

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu [category]  — e.g. .menu pokemon",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod, sender, args }) {
    const jid = msg.key.remoteJid;
    const allPlugins = getPlugins();
    const isGroup = jid?.endsWith("@g.us");
    const senderNum = sender.split("@")[0].split(":")[0];
    const mention = `@${senderNum}`;
    const gs = isGroup ? (groupSettings.get(jid) || {}) : {};
    const disabledCats = new Set(gs.disabledCategories || []);
    const runtime = getRuntimeSettings();
    const menuPrefix = runtime.prefix || prefix;
    const requestedCategory = normalizeCategory(args?.[0] || "");

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
      ? `*MENU*
\n${READMORE}\n`
      : `*Hello ${mention}, I am ${runtime.botName}* 👋
╭━━━━━━━━━━━━━━━━━━━━╮
│ ✦ *REGISTER*
│ ├─ 🌸 ꕥ *${menuPrefix}reg* › Use economy commands
│ ├─ 📜 ꕥ *${menuPrefix}rules* › Bot rules
│ ├─ 🌐 ꕥ *${menuPrefix}support* › Official group
│ └─ ⚡ ꕥ *${menuPrefix}reqbot* › Add me to your group
╰━━━━━━━━━━━━━━━━━━━━╯
\n${READMORE}\n`;

    for (const cat of visibleCats) {
      const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;
      if (isCatDisabled) continue;
      const emoji = categoryEmojis[cat] || "📌";
      const title = categoryTitles[cat] || cat.toUpperCase();
      const disabledTag = isGroup && disabledCats.has(cat) && showStaff ? " _(disabled)_" : "";
      const categoryPlugins = [...map.get(cat)].sort((a, b) => a.name.localeCompare(b.name));
      if (requestedCategory) {
        text += renderCategory(emoji, title, disabledTag, categoryPlugins, menuPrefix, true);
        text += `\n\n🌟 _Use *.menu* to return to the full command atlas._`;
      } else {
        text += renderCategory(emoji, title, disabledTag, categoryPlugins, menuPrefix);
      }
    }

    if (isGroup && !showStaff && disabledCats.size > 0) {
      text += `\n\n🔒 *Disabled in this group:* ${[...disabledCats].join(", ")}\n_Ask a staff member to enable them._`;
    }

    return sock.sendMessage(jid, {
      image: { url: runtime.botImage },
      caption: text,
      mentions: [sender],
    }, { quoted: msg });
  },
};