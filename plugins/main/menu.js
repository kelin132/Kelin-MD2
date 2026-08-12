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
  main: "𝗠𝗔𝗜𝗡",
  economy: "𝗘𝗖𝗢𝗡𝗢𝗠𝗬",
  guild: "𝗚𝗨𝗜𝗟𝗗",
  pets: "𝗣𝗘𝗧𝗦",
  cards: "𝗖𝗔𝗥𝗗𝗦",
  pokemon: "𝗣𝗢𝗞𝗘𝗠𝗢𝗡",
  dragonball: "𝗗𝗥𝗔𝗚𝗢𝗡 𝗕𝗔𝗟𝗟",
  games: "𝗚𝗔𝗠𝗘𝗦",
  fun: "𝗙𝗨𝗡",
  ai: "𝗔𝗜",
  search: "𝗦𝗘𝗔𝗥𝗖𝗛",
  image: "𝗜𝗠𝗔𝗚𝗘",
  utilities: "𝗨𝗧𝗜𝗟𝗜𝗧𝗜𝗘𝗦",
  download: "𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗",
  group: "𝗚𝗥𝗢𝗨𝗣",
  anime: "𝗔𝗡𝗜𝗠𝗘",
  staff: "𝗦𝗧𝗔𝗙𝗙",
  owner: "𝗢𝗪𝗡𝗘𝗥",
  company: "𝗖𝗢𝗠𝗣𝗔𝗡𝗬",
  naruto: "𝗡𝗔𝗥𝗨𝗧𝗢",
  media: "𝗠𝗘𝗗𝗜𝗔",
  admin: "𝗔𝗗𝗠𝗜𝗡",
};

const PUBLIC_CATS = new Set([
  "main", "economy", "company", "guild", "games", "fun", "ai", "search",
  "media", "utilities", "download", "group", "anime", "cards",
  "naruto", "pokemon", "pets", "image", "dragonball",
]);

function renderCategory(emoji, title, disabledTag, commands) {
  const commandLines = commands
    .map((command) => `│ ꕥ ${command}`)
    .join("\n");

  return `\n╭─${emoji}「 ${title}${disabledTag} 」\n│\n${commandLines}\n╰━━━━━━━━━━━━━━━━━━━━`;
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

    const map = new Map();
    for (const plugin of allPlugins) {
      const cat = plugin.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(plugin.name);
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

    let text = `𝗛𝗲𝗹𝗹𝗼 𝘀𝗲𝗻𝗽𝗮𝗶 ${mention}, 𝗜 𝗮𝗺 𝗭𝗵𝗼𝗻𝗴𝗹𝗶 👋
╭━━━━━━━━━━━━━━━━━━━━╮
│ ✦ 𝗥𝗘𝗚𝗜𝗦𝗧𝗘𝗥
│ ├─ 🌸 ꕥ ${menuPrefix}𝗿𝗲𝗴 › 𝗨𝘀𝗲 𝗲𝗰𝗼𝗻𝗼𝗺𝘆 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀
│ ├─ 📜 ꕥ ${menuPrefix}𝗿𝘂𝗹𝗲𝘀 › 𝗕𝗼𝘁 𝗿𝘂𝗹𝗲𝘀
│ ├─ 🌐 ꕥ ${menuPrefix}𝘀𝘂𝗽𝗽𝗼𝗿𝘁 › 𝗢𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗴𝗿𝗼𝘂𝗽
│ └─ ⚡ ꕥ ${menuPrefix}𝗿𝗲𝗾𝗯𝗼𝘁 › 𝗔𝗱𝗱 𝗺𝗲 𝘁𝗼 𝘆𝗼𝘂𝗿 𝗴𝗿𝗼𝘂𝗽
╰━━━━━━━━━━━━━━━━━━━━╯
\n${READMORE}\n`;

    for (const cat of sortedCats) {
      const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;
      if (isCatDisabled) continue;
      const emoji = categoryEmojis[cat] || "📌";
      const title = categoryTitles[cat] || cat.toUpperCase();
      const disabledTag = isGroup && disabledCats.has(cat) && showStaff ? " _(disabled)_" : "";
      const displayCommands = map.get(cat).sort().map((command) => {
        const styledCommand = command
          .replace(/[a-z]/g, (letter) => String.fromCodePoint(0x1d5ee + letter.charCodeAt(0) - 97))
          .replace(/[A-Z]/g, (letter) => String.fromCodePoint(0x1d5d4 + letter.charCodeAt(0) - 65));
        return `${menuPrefix}${styledCommand}`;
      });
      text += renderCategory(emoji, title, disabledTag, displayCommands);
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