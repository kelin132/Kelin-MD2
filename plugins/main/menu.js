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
  version: "1.0.0",
  async run({ sock, msg, prefix }) {
    const categories = [
      { name: "Main", emoji: "🏠", cmds: ["ping", "alive", "info", "runtime"] },
      { name: "AI", emoji: "🤖", cmds: ["chatgpt", "gemini", "deepseek"] },
      { name: "Download", emoji: "📥", cmds: ["ytdl", "ytmp3", "tiktok"] },
      { name: "Fun", emoji: "🎭", cmds: ["joke", "dare", "truth", "quote"] },
      { name: "Search", emoji: "🔍", cmds: ["google", "wiki", "weather"] },
      { name: "Media", emoji: "🖼️", cmds: ["sticker", "qr"] },
      { name: "Group", emoji: "👥", cmds: ["welcome", "goodbye", "antilink"] },
      { name: "Admin", emoji: "🛡️", cmds: ["kick", "promote", "demote"] },
      { name: "Owner", emoji: "👑", cmds: ["broadcast", "eval", "restart"] },
    ];
    const lines = ["*KELIN MD", ""];
    for (const cat of categories) {
      lines.push(`${cat.emoji} *${cat.name}*`);
      lines.push(cat.cmds.map((c) => `  ${prefix}${c}`).join("  "));
      lines.push("");
    }
    lines.push("© KELIN MD");
    await sock.sendMessage(msg.key.remoteJid, { text: lines.join("\n") });
  },
};
