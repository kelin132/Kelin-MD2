import { getPlugins } from "../../lib/pluginManager.mjs";

const categoryEmojis = {
  main:       "🏡",
  economy:    "💰",
  guild:      "⚔️",
  staff:      "🛡️",
  games:      "🎮",
  fun:        "🎀",
  ai:         "🪄",
  search:     "🔎",
  media:      "🖼️",
  utilities:  "🔧",
  download:   "📥",
  group:      "🌸",
  admin:      "⚜️",
  anime:      "🍡",
  owner:      "👑",
};

// Categories shown to everyone — staff/owner see all
const PUBLIC_CATS = new Set([
  "main", "economy", "guild", "games", "fun", "ai",
  "search", "media", "utilities", "download", "group", "anime","staff", 
]);

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod }) {
    const allPlugins = getPlugins();

    // Group by category
    const map = new Map();
    for (const plugin of allPlugins) {
      const cat = plugin.category || "other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(plugin.name);
    }

    // Decide which cats to show
    const showStaff = isOwner || isStaff || isMod;
    const showOwner = isOwner || isStaff || isMod;

    // Ordered list
    const order = [
      "main", "economy", "guild", "games", "fun", "ai",
      "search", "media", "utilities", "download", "group", "admin", "anime",
      ...(showStaff ? ["staff"] : []),
      ...(showOwner ? ["owner"] : []),
    ];

    const sortedCats = [
      ...order.filter(c => map.has(c)),
      ...[...map.keys()].filter(c => !order.includes(c) && PUBLIC_CATS.has(c)).sort(),
    ];

    const date = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const totalPublic = [...map.entries()]
      .filter(([c]) => PUBLIC_CATS.has(c) || showStaff || showOwner)
      .reduce((sum, [, cmds]) => sum + cmds.length, 0);

    let text =
`╭━━━〔 🌙 *KELIN MD* 🌙 〕━━━╮

  ✨ *Premium WhatsApp Bot*
  ⚡ Fast • Smart • Powerful

  🔑 Prefix   : ${prefix}
  📦 Commands : ${allPlugins.length}
  🕐 Time     : ${date}
  ${isOwner ? "👑 Mode    : Owner" : isStaff ? "🛡️ Mode    : Staff" : isMod ? "🔧 Mode    : Mod" : ""}

╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

    for (const cat of sortedCats) {
      const cmds  = map.get(cat).sort();
      const emoji = categoryEmojis[cat] || "📌";
      const title = cat.charAt(0).toUpperCase() + cat.slice(1);

      text += `\n╭─${emoji} *${title}* (${cmds.length})\n`;
      for (const cmd of cmds) {
        text += `│ ◦ ${prefix}${cmd}\n`;
      }
      text += "╰────────────────";
    }

    text += `

╭━━━━━━━━━━━━━━━━━━━━╮
│  💡 *Tips:*
│  • Register : ${prefix}register <name>
│  • Balance  : ${prefix}balance
│  • Vault    : ${prefix}vault
│  • History  : ${prefix}history
│  • Play     : ${prefix}wordle
╰━━━━━━━━━━━━━━━━━━━━╯

> © KELIN MD — Stay Premium ⚡`;

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        image: { url: "https://cdn.phototourl.com/free/2026-07-19-d1c912db-8aa1-468e-8419-0051ce547478.jpg" },
        caption: text,
      },
      { quoted: msg }
    );
  }
};
