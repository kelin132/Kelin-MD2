import { getPlugins } from "../../lib/pluginManager.mjs";
import { groupSettings } from "../../lib/groupSettings.js";

// Zero-width spaces — forces WhatsApp to collapse the message with a "read more" button
const READMORE = "\u200B".repeat(4000);

const categoryEmojis = {
  main:       "🏡",
  economy:    "💰",
  guild:      "⚔️",
  naruto:     "🪾",
  dragonball: "🐉",
  pokemon:    "🎮",
  cards:      "🃏",
  pets:       "🐾",
  anime:      "🍡",
  staff:      "🛡️",
  company:    "🏢",
  games:      "🎲",
  fun:        "🎀",
  ai:         "🪄",
  search:     "🔎",
  image:      "🎨",
  utilities:  "🔧",
  download:   "📥",
  group:      "🌸",
  admin:      "⚜️",
  owner:      "👑",
};

// Categories shown to everyone — staff/owner see all
const PUBLIC_CATS = new Set([
  "main", "economy", "company", "guild", "games", "fun", "ai",
  "search", "media", "utilities", "download", "group", "anime",
  "cards", "staff", "naruto", "pokemon", "pets", "image", "dragonball",
]);

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu",
  aliases: ["help", "cmds", "commands", "start"],
  cooldown: 10,

  async run({ sock, msg, prefix, isOwner, isStaff, isMod, sender }) {
    const jid        = msg.key.remoteJid;
    const allPlugins = getPlugins();
    const isGroup    = jid?.endsWith("@g.us");

    // Sender phone number for mention
    const senderNum = sender.split("@")[0].split(":")[0];
    const mention   = `@${senderNum}`;

    // Per-group disabled categories
    const gs              = isGroup ? (groupSettings.get(jid) || {}) : {};
    const disabledCats    = new Set(gs.disabledCategories || []);

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
      "main", "economy", "company", "guild", "pets", "cards",
      "naruto", "pokemon", "dragonball", "games", "fun", "ai",
      "search", "media", "image", "utilities", "download",
      "group", "admin", "anime",
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
      hour: "2-digit", minute: "2-digit",
    });

    // ── Header — shown before the "read more" collapse ──────────────────────
    let text = `*Hello* senpai ${mention},I am Akira👋
╭━━━━━━━━━━━━━━━━━━━━╮
|ꕥ ${prefix}*reg* to use economy cmds
|ꕥ ${prefix}*rules* to see bot rules 
|ꕥ ${prefix}*support* for official group
|ꕥ ${prefix}*reqbot* for adding in your group 
╰━━━━━━━━━━━━━━━━━━━━╯
\n${READMORE}\n`;

    // ── Command list ──────────────────────────────────────────────────────
    for (const cat of sortedCats) {
      const emoji = categoryEmojis[cat] || "📌";
      const title = cat.charAt(0).toUpperCase() + cat.slice(1);
      const cmds  = map.get(cat).sort();

      // For group chats: mark disabled categories (staff still see them)
      const isCatDisabled = isGroup && disabledCats.has(cat) && !showStaff;

      if (isCatDisabled) continue; // hide disabled cats from regular users

      const disabledTag = (isGroup && disabledCats.has(cat) && showStaff)
        ? " _(disabled)_" : "";

      text +=
`\n╭─${emoji}「 *${title}*${disabledTag} 」
│ ${cmds.map(c => `\`${prefix}${c}\``).join(" • ")}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    // ── Disabled-category notice for regular users ────────────────────────
    if (isGroup && !showStaff && disabledCats.size > 0) {
      const disabledList = [...disabledCats].join(", ");
      text +=
`\n
╭─🔒「 *Disabled in this group* 」
│ ${disabledList}
│ _Ask a staff member to enable them._
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    }

    text += `\n\n> © AKIRA`;

    await sock.sendMessage(
      jid,
      {
        image:    { url: "https://cdn.phototourl.com/free/2026-07-26-ef31287b-f8c8-4bec-943a-cf435a79d5ad.jpg" },
        caption:  text,
        mentions: [sender],
      },
      { quoted: msg }
    );
  },
};
