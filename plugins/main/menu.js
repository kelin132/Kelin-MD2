import { getPlugins } from "../../lib/pluginManager.mjs";

// Zero-width spaces — forces WhatsApp to collapse the message with a "read more" button
const READMORE = "\u200B".repeat(4000);

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
  "search", "media", "utilities", "download", "group", "anime", "staff",
]);

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod, sender }) {
    const jid      = msg.key.remoteJid;
    const allPlugins = getPlugins();

    // Sender phone number for mention (strip @s.whatsapp.net / device suffix)
    const senderNum = sender.split("@")[0].split(":")[0];
    const mention   = `@${senderNum}`;

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

    // ── Greeting shown before the "read more" collapse ──────────────────────
    let text = `*Hello* ${mention},I am Akira👋\n${READMORE}\n`;

    // ── Header ───────────────────────────────────────────────────────────────
    text +=
`╭━━━〔 🌙 *KELIN MD* 🌙 〕━━━╮
  🔑 Prefix   : ${prefix}
  📦 Plugins  : ${allPlugins.length}
  🕐 Time     : ${date}
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;

    // ── Command list ─────────────────────────────────────────────────────────
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

> © AKIRA`;

    await sock.sendMessage(
      jid,
      {
        image:    { url: "https://cdn.phototourl.com/free/2026-07-19-d1c912db-8aa1-468e-8419-0051ce547478.jpg" },
        caption:  text,
        mentions: [sender],
      },
      { quoted: msg }
    );
  }
};
