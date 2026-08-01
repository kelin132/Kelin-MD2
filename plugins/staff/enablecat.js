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
import { getPlugins } from "../../lib/pluginManager.mjs";

// Categories that can never be disabled (essential bot functions)
const PROTECTED_CATS = new Set(["main", "staff", "owner", "group"]);

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
  games:      "🎮",
  fun:        "🎀",
  ai:         "🪄",
  search:     "🔎",
  image:      "🎨",
  utilities:  "🔧",
  download:   "📥",
  group:      "🌸",
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

    // Collect all known categories from loaded plugins
    const allCats = [...new Set(getPlugins().map(p => p.category || "other"))].sort();

    // ── No args: show status list ─────────────────────────────────────────
    if (!args[0]) {
      const lines = allCats.map(cat => {
        const emoji     = getEmoji(cat);
        const isDisabled = disabled.has(cat);
        const isProtected = PROTECTED_CATS.has(cat);
        const statusIcon = isProtected ? "🔒 Protected" : isDisabled ? "❌ Disabled" : "✅ Enabled";
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

    const target  = args[0].toLowerCase();
    const enable  = cmd === "enablecat";

    // Validate category exists
    if (!allCats.includes(target)) {
      return sock.sendMessage(jid, {
        text:
`╭─❌「 *UNKNOWN CATEGORY* 」─╮
│ Category *${target}* not found.
│
│ Available: ${allCats.join(", ")}
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
    const cmdCount   = getPlugins().filter(p => (p.category || "other") === target).length;

    await sock.sendMessage(jid, {
      text:
`╭─${emoji}「 *CATEGORY UPDATED* 」─╮
│ Category  :: *${target}*
│ Status    :: ${statusIcon}
│ Commands  :: *${cmdCount} command${cmdCount !== 1 ? "s" : ""}*
│
│ ${enable
  ? `Users can now use *${target}* commands.`
  : `*${target}* commands are now blocked in this group.\nStaff and owner still have full access.`}
╰─────────────────────────────❀`,
    }, { quoted: msg });
  },
};
