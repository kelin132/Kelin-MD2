/**
 * KELIN MD — .dbzplanet
 * Fetches info about a Dragon Ball planet.
 */
import fetch from "node-fetch";

export default {
  name: "dbzplanet",
  aliases: ["dbzp"],
  description: "Get info about a Dragon Ball planet",
  category: "dragonball",
  usage: ".dbzplanet <name>",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .dbzplanet <name> (e.g. Namek)" }, { quoted: msg });

    try {
      const res = await fetch(`https://dragonball-api.com/api/planets?name=${encodeURIComponent(text)}`);
      const data = await res.json();
      
      const planet = Array.isArray(data) ? data[0] : data;
      if (!planet || planet.error || (Array.isArray(data) && data.length === 0)) {
        return sock.sendMessage(jid, { text: `❌ Planet *${text}* not found.` }, { quoted: msg });
      }

      const caption = `
🪐 *DRAGON BALL PLANET* 🪐

🌍 *Name:* ${planet.name}
💀 *Is Destroyed:* ${planet.isDestroyed ? "Yes" : "No"}

📝 *Description:*
${planet.description || "No description available."}
`.trim();

      if (planet.image) {
        await sock.sendMessage(jid, { image: { url: planet.image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch planet info." }, { quoted: msg });
    }
  },
};
