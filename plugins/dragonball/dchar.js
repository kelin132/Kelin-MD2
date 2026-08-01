// plugins/dragonball/dchar.js
// Look up any Dragon Ball character from the API
// Usage: .dchar Goku

import { getCharacterInfo } from "../../lib/dragonballAPI.mjs";

export default {
  name: "dchar",
  description: "Look up any Dragon Ball character — power level, race, transformations and more",
  category: "dragonball",
  usage: ".dchar <character name>",
  aliases: ["dbzchar", "dcharacter", "dlookup", "dinfo"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text || !text.trim()) {
      return sock.sendMessage(jid, {
        text:
`🐉 *CHARACTER LOOKUP*

Usage: *.dchar <name>*

Examples:
• .dchar Goku
• .dchar Vegeta
• .dchar Piccolo
• .dchar Freezer
• .dchar Majin Buu
• .dchar Broly`,
      }, { quoted: msg });
    }

    const name = text.trim();

    try {
      await sock.sendMessage(jid, { text: `🔍 Looking up *${name}*...` }, { quoted: msg });

      const char = await getCharacterInfo(name);

      if (!char) {
        return sock.sendMessage(jid, {
          text: `❌ Character "*${name}*" not found.\n\nTry the full name.\nExample: *.dchar Goku*  or  *.dchar Majin Buu*`,
        }, { quoted: msg });
      }

      // Transformations
      const forms = Array.isArray(char.transformations) && char.transformations.length
        ? char.transformations.map((t, i) => `   ${i + 1}. ⚡ *${t.name}* — KI: ${t.ki || "?"}`).join("\n")
        : "   — No transformations listed";

      const caption =
`🐉 *${char.name}*

🌍 *Race:* ${char.race || "Unknown"}
⚥ *Gender:* ${char.gender || "Unknown"}
🌐 *Affiliation:* ${char.affiliation || "Unknown"}

💪 *Base KI:* ${char.ki || "?"}
🔥 *Max KI:* ${char.maxKi || "?"}

⚡ *Transformations:*
${forms}

KELIN MD 🐉`;

      const imgUrl = char.image || null;

      if (imgUrl) {
        return sock.sendMessage(jid, { image: { url: imgUrl }, caption }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text: caption }, { quoted: msg });

    } catch (err) {
      console.error("DCHAR ERROR:", err);
      return sock.sendMessage(jid, {
        text: `❌ Failed to look up *${name}*. The Dragon Ball API may be slow — try again.`,
      }, { quoted: msg });
    }
  },
};
