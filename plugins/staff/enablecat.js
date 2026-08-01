/**
 * KELIN MD — .enablecat / .disablecat
 * Allow staff/mods to enable or disable entire command categories in a group.
 *
 * Usage:
 *   .enablecat              — list all categories and their status
 *   .enablecat <category>   — enable a category in this group
 *   .disablecat <category>  — disable a category in this group
 *
 * Protected categories (staff/owner always have access):
 *   main, staff, owner, group
 *
 * The actual enforcement happens in lib/pluginManager.mjs.
 */
import { groupSettings } from "../../lib/groupSettings.js";

// Categories that can never be disabled (essential bot functions)
const PROTECTED_CATS = new Set(["main", "staff", "owner", "group"]);

// All known categories — no circular import needed
const ALL_CATS = [
  "main", "economy", "company", "guild", "pets", "cards",
  "naruto", "pokemon", "dragonball", "games", "fun", "ai",
  "search", "media", "image", "utilities", "download",
  "group", "anime", "staff", "owner",
];

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
  owner:      "👑",
};

function getEmoji(cat) {
  return categoryEmojis[cat] || "📌";
}

export default {
  name: "enablecat",
  aliases: ["disablecat", "togglecat", "catcontrol"],
  description: "Enable or disable a command category in this group",
  category: "staff",
  usage: ".enablecat <category> | .disablecat <category>",
  isMod: true,
  cooldown: 3,

  async run({ sock, msg, args, cmd }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    const settings = groupSettings.get(jid) || {};
    const disabled  = new Set(settings.disabledCategories || []);

    // ── No args: show status list ─────────────────────────────────────────
    if (!args[0]) {
      const lines = ALL_CATS.map(cat => {
        const emoji       = getEmoji(cat);
        const isProtected = PROTECTED_CATS.has(cat);
        const isDisabled  = disabled.has(cat);
        const statusIcon  = isProtected ? "🔒 Protected" : isDisabled ? "❌ Disabled" : "✅ Enabled";
        return `│ ${emoji} *${cat}* — ${statusIcon}`;
      });

      return sock.sendMessage(jid, {
        text:
`╭─🛡️「 *CATEGORY CONTROL* 」─╮
${lines.join("\n")}
│
│ *.enablecat <cat>*  — enable a category
│ *.disablecat <cat>* — disable a category
│ 🔒 Protected categories cannot be disabled
╰─────────────────────────────❀`,
      }, { quoted: msg });
    }

    const target = args[0].toLowerCase();
    const enable = cmd === "enablecat";

    // Validate category exists
    if (!ALL_CATS.includes(target)) {
      return sock.sendMessage(jid, {
        text:
`╭─❌「 *UNKNOWN CATEGORY* 」─╮
│ Category *${target}* not found.
│
│ Available: ${ALL_CATS.filter(c => !PROTECTED_CATS.has(c)).join(", ")}
╰─────────────────────────────❀`,
      }, { quoted: msg });
    }

    // Block protected categories from being disabled
    if (!enable && PROTECTED_CATS.has(target)) {
      return sock.sendMessage(jid, {
        text:
`╭─🔒「 *PROTECTED CATEGORY* 」─╮
│ The *${target}* category cannot be disabled.
│ It contains essential bot commands.
╰─────────────────────────────❀`,
      }, { quoted: msg });
    }

    // Apply change
    if (enable) {
      disabled.delete(target);
    } else {
      disabled.add(target);
    }

    groupSettings.set(jid, { disabledCategories: [...disabled] });

    const emoji      = getEmoji(target);
    const statusIcon = enable ? "✅ *ENABLED*" : "❌ *DISABLED*";

    await sock.sendMessage(jid, {
      text:
`╭─${emoji}「 *CATEGORY UPDATED* 」─╮
│ Category :: *${target}*
│ Status   :: ${statusIcon}
│
│ ${enable
  ? `Users can now use *${target}* commands.`
  : `*${target}* commands are now blocked.\nStaff and owner still have full access.`}
╰─────────────────────────────❀`,
    }, { quoted: msg });
  },
};
