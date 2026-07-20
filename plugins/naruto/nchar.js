// plugins/naruto/nchar.js
// Look up any Naruto character from the Dattebayo API
// Usage: .nchar Naruto Uzumaki

import { getCharacterInfo } from "../../lib/narutoAPI.mjs";

export default {
  name: "nchar",
  description: "Look up any Naruto character — stats, jutsu, nature types and more",
  category: "naruto",
  usage: ".nchar <character name>",
  aliases: ["ncharacter", "nlookup", "ninfo"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text || !text.trim()) {
      return sock.sendMessage(jid, {
        text:
`🥷 *CHARACTER LOOKUP*

Usage: *.nchar <name>*

Examples:
• .nchar Naruto Uzumaki
• .nchar Sasuke Uchiha
• .nchar Kakashi Hatake
• .nchar Itachi Uchiha
• .nchar Gaara`
      }, { quoted: msg });
    }

    const name = text.trim();

    try {
      await sock.sendMessage(jid, { text: `🔍 Looking up *${name}*...` }, { quoted: msg });

      const char = await getCharacterInfo(name);

      if (!char) {
        return sock.sendMessage(jid, {
          text: `❌ Character "*${name}*" not found.\n\nTry a different spelling or use their full name.\nExample: .nchar Sasuke Uchiha`
        }, { quoted: msg });
      }

      // Build jutsu list (up to 10)
      const jutsuList = Array.isArray(char.jutsu) && char.jutsu.length
        ? char.jutsu.slice(0, 10).map(j => `   🌀 ${j}`).join("\n")
        : "   — Unknown";

      // Nature types
      const natures = Array.isArray(char.natureType) && char.natureType.length
        ? char.natureType.slice(0, 5).map(n => n.replace(/\s*\(.*\)/, "")).join(", ")
        : "Unknown";

      // Tools
      const tools = Array.isArray(char.tools) && char.tools.length
        ? char.tools.slice(0, 5).join(", ")
        : null;

      // Family
      let family = "";
      if (char.family && typeof char.family === "object") {
        const entries = Object.entries(char.family).slice(0, 5);
        if (entries.length) {
          family = "\n👨‍👩‍👧 *Family:*\n" + entries.map(([k, v]) =>
            `   ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`
          ).join("\n");
        }
      }

      // Debut
      let debut = "";
      if (char.debut?.anime) debut = `\n📺 *Debut:* ${char.debut.anime}`;

      const caption =
`🥷 *${char.name}*

🌊 *Nature Types:* ${natures}

⚔️ *Jutsu (Top 10):*
${jutsuList}${tools ? `\n\n🗡️ *Tools:* ${tools}` : ""}${family}${debut}

Data from Dattebayo API 🍃`;

      // Pick the best (last) image — usually the Shippuden/mature version
      const imgUrl = char.images?.length
        ? char.images[char.images.length - 1]
        : null;

      if (imgUrl) {
        return sock.sendMessage(jid, { image: { url: imgUrl }, caption }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: caption }, { quoted: msg });

    } catch (err) {
      console.error("NCHAR ERROR:", err);
      return sock.sendMessage(jid, {
        text: `❌ Failed to look up *${name}*. The Dattebayo API may be slow — try again.`
      }, { quoted: msg });
    }
  }
};
