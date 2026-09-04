/**
 * KELIN MD — .dbzchar
 * Fetches info about a Dragon Ball character.
 */
import fetch from "node-fetch";

export default {
  name: "dbzchar",
  aliases: ["dbzcharacter", "dbzc"],
  description: "Get info about a Dragon Ball character",
  category: "dragonball",
  usage: ".dbzchar <name>",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .dbzchar <name> (e.g. Goku)" }, { quoted: msg });

    try {
      const res = await fetch(`https://dragonball-api.com/api/characters?name=${encodeURIComponent(text)}`);
      const data = await res.json();
      
      const char = Array.isArray(data) ? data[0] : data;
      if (!char || char.error || (Array.isArray(data) && data.length === 0)) {
        return sock.sendMessage(jid, { text: `❌ Character *${text}* not found.` }, { quoted: msg });
      }

      const caption = `
🌟 *DRAGON BALL CHARACTER* 🌟

👤 *Name:* ${char.name}
🧬 *Race:* ${char.race}
⚧ *Gender:* ${char.gender}
💪 *Max KI:* ${char.maxKi}
🛡️ *Affiliation:* ${char.affiliation}

📝 *Description:*
${char.description || "No description available."}
`.trim();

      if (char.image) {
        await sock.sendMessage(jid, { image: { url: char.image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch character info." }, { quoted: msg });
    }
  },
};
