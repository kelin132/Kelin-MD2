import { getPlugins } from "../../lib/pluginManager.mjs";

// Zero-width spaces — forces WhatsApp to collapse the message with a "read more" button
const READMORE = "\u200B".repeat(4000);

const categoryEmojis = {
  main:       "🏡",
  economy:    "💰",
  guild:      "⚔️",
  naruto:     "🪾",
  cards:      "🃏",
  pets:       "🐾",
  anime:      "🍡", 
  staff:      "🛡️",
  games:      "🎮",
  fun:        "🎀",
  ai:         "🪄",
  search:     "🔎",
  images:     "🎨",
  media:      "🖼️",
  utilities:  "🔧",
  download:   "📥",
  group:      "🌸",
  admin:      "⚜️",
  owner:      "👑",
};

// Categories shown to everyone — staff/owner see all
const PUBLIC_CATS = new Set([
  "main", "economy", "guild", "games", "fun", "ai",
  "search", "media", "utilities", "download", "group", "anime", "cards", "staff", "naruto", "pets","images",
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
      "main", "economy", "guild", "pets", "cards","games", "fun", "ai",
      "search", "media", "images","utilities", "download", "group", "admin", "anime", 
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
    let text = `*Hello* senpai ${mention},I am Akira👋
╭━━━━━━━━━━━━━━━━━━━━╮
|ꕥ ${prefix}*reg* to use economy cmds
|ꕥ ${prefix}*rules* to see bot rules 
|ꕥ ${prefix}*support* for official group
|ꕥ ${prefix}*reqbot* for adding in your group 
╰━━━━━━━━━━━━━━━━━━━━╯
\n${READMORE}\n`;

// ── Command list ─────────────────────────────────────────────────────────
for (const cat of sortedCats) {
  const cmds = map.get(cat).sort();
  const emoji = categoryEmojis[cat] || "📌";
  const title = cat.charAt(0).toUpperCase() + cat.slice(1);

  text += `\n╭─${emoji} *${title}* (${cmds.length})\n`;
  text += `│ ${cmds.map(cmd => `${prefix}${cmd}`).join(" • ")}\n`;
  text += "╰────────────────";
}

    text += `

> © AKIRA`;

    await sock.sendMessage(
      jid,
      {
        image:    { url: "https://cdn.phototourl.com/free/2026-07-20-39c64ceb-8083-433e-a6ce-bac6a8877cc6.jpg" },
        caption:  text,
        mentions: [sender],
      },
      { quoted: msg }
    );
  }
};