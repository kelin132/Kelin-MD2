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

const PUBLIC_CATS = new Set([
  "main", "economy", "company", "guild", "games", "fun", "ai", "search",
  "media", "utilities", "download", "group", "anime", "cards", "staff",
  "naruto", "pokemon", "pets", "image", "dragonball",
]);

function renderCategory(layout, emoji, title, disabledTag, commandText) {
  if (layout === 2) {
    return `\n╭━━━〔 ${emoji} *${title}*${disabledTag} 〕━━━╮\n┃ ${commandText}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
  }
  if (layout === 3) {
    return `\n╭─❀「 ${emoji} *${title}*${disabledTag} 」❀─╮\n│ ${commandText}\n╰───────────────❀`;
  }
  if (layout === 4) {
    return `\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ ${emoji} *${title}*${disabledTag}\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ ${commandText}\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
  }
  return `\n╭─${emoji}「 *${title}*${disabledTag} 」\n│ ${commandText}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod, sender }) {
    const jid = msg.key.remoteJid;
    const allPlugins = getPlugins();
    const isGroup = jid?.endsWith("@g.us");
    const senderNum = sender.split("@")[0].split(":")[0];
    const mention = `@${senderNum}`;
    const gs = isGroup ? (groupSettings.get(jid) || {}) : {};
    const disabledCats = new Set(gs.disabledCategories || []);
    const runtime = getRuntimeSettings();
    const menuPrefix = runtime.prefix || prefix;
    const layout = runtime.layout || 1;
    const botName = runtime.botName || "KELIN MD";

    const map = new Map();
    for (const plugin of allPlugins) {
      const cat = plugin.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(plugin.name);
    }

    // Staff commands are visible only to staff-level users and the owner.
    // Keep owner commands even narrower so moderators do not see either
    // restricted section in the public menu.
    const showStaff = isOwner || isStaff;
    const showOwner = isOwner;
    const order = [
      "main", "economy", "company", "guild", "pets", "cards", "naruto",
      "pokemon", "dragonball", "games", "fun", "ai", "search", "media",
      "image", "utilities", "download", "group", "admin", "anime",
      ...(showStaff ? ["staff"] : []),
      ...(showOwner ? ["owner"] : []),
    ];
    const sortedCats = [
      ...order.filter((cat) => map.has(cat)),
      ...[...map.keys()]
        .filter((cat) =>
          !order.includes(cat) &&
          !["staff", "owner"].includes(cat) &&
          PUBLIC_CATS.has(cat)
        )
        .sort(),
    ];

    let text = `*Hello* senpai ${mention}, I am ${botName} 👋
╭━━━━━━━━━━━━━━━━━━━━╮
|ꕥ ${menuPrefix}reg to use economy cmds
|ꕥ ${menuPrefix}rules to see bot rules
|ꕥ ${menuPrefix}support for official group
|ꕥ ${menuPrefix}reqbot for adding in your group
╰━━━━━━━━━━━━━━━━━━━━╯
\n${READMORE}\n`;

    for (const cat of sortedCats) {
      const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;
      if (isCatDisabled) continue;
      const emoji = categoryEmojis[cat] || "📌";
      const title = cat.charAt(0).toUpperCase() + cat.slice(1);
      const disabledTag = isGroup && disabledCats.has(cat) && showStaff ? " _(disabled)_" : "";
      const commandText = map.get(cat).sort().map((command) => `\`${menuPrefix}${command}\``).join(" • ");
      text += renderCategory(layout, emoji, title, disabledTag, commandText);
    }

    if (isGroup && !showStaff && disabledCats.size > 0) {
      text += `\n\n🔒 *Disabled in this group:* ${[...disabledCats].join(", ")}\n_Ask a staff member to enable them._`;
    }

    text += `\n\n> © ${botName}  •  Layout ${layout}/4`;
    return sock.sendMessage(jid, {
      image: { url: runtime.botImage },
      caption: text,
      mentions: [sender],
    }, { quoted: msg });
  },
};