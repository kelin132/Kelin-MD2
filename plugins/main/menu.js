const CATEGORY_META = {
  main:      { emoji: "🏠", label: "Main" },
  ai:        { emoji: "🤖", label: "AI" },
  download:  { emoji: "📥", label: "Download" },
  fun:       { emoji: "🎭", label: "Fun" },
  search:    { emoji: "🔍", label: "Search" },
  media:     { emoji: "🖼️",  label: "Media" },
  group:     { emoji: "👥", label: "Group" },
  admin:     { emoji: "🛡️",  label: "Admin" },
  economy:   { emoji: "💰", label: "Economy" },
  guild:     { emoji: "⚔️",  label: "Guild" },
  games:     { emoji: "🎮", label: "Games" },
  anime:     { emoji: "🎌", label: "Anime" },
  utilities: { emoji: "🔧", label: "Utilities" },
  owner:     { emoji: "👑", label: "Owner" },
};

// Preferred display order
const ORDER = ["main","ai","download","fun","search","media","group","admin","economy","guild","games","anime","utilities","owner"];

export default {
  name: "menu",
  description: "Display all available commands",
  category: "main",
  usage: ".menu",
  aliases: ["help", "cmds", "commands"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "2.0.0",
  async run({ sock, msg, prefix, allPlugins }) {
    const jid = msg.key.remoteJid;

    // Group plugins by category
    const cats = {};
    for (const p of (allPlugins ?? [])) {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p.name);
    }

    // Sort categories in preferred order, then alphabetically for unknowns
    const catKeys = [
      ...ORDER.filter((k) => cats[k]),
      ...Object.keys(cats).filter((k) => !ORDER.includes(k)).sort(),
    ];

    const lines = [
      `╔══════════════════════════╗`,
      `║   *KELIN MD — Commands*  ║`,
      `╚══════════════════════════╝`,
      "",
    ];

    for (const key of catKeys) {
      const meta  = CATEGORY_META[key] ?? { emoji: "📂", label: key };
      const cmds  = cats[key].sort();
      lines.push(`${meta.emoji} *${meta.label}*`);
      lines.push(cmds.map((c) => `  ${prefix}${c}`).join("  "));
      lines.push("");
    }

    lines.push(`Total: *${(allPlugins ?? []).length} commands*`);
    lines.push(`Prefix: *${prefix}*`);
    lines.push(`© KELIN MD`);

    await sock.sendMessage(jid, { text: lines.join("\n") });
  },
};
