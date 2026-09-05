/**
 * KELIN MD — .pokemove
 * Fetches info about a Pokemon move.
 */
import fetch from "node-fetch";

export default {
  name: "pokemove",
  aliases: ["pokemonmove", "pm"],
  description: "Get info about a Pokemon move",
  category: "pokemon",
  usage: ".pokemove <name>",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .pokemove <name> (e.g. Thunderbolt)" }, { quoted: msg });

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/move/${text.toLowerCase().replace(/\s+/g, "-")}`);
      if (!res.ok) return sock.sendMessage(jid, { text: `❌ Move *${text}* not found.` }, { quoted: msg });
      
      const data = await res.json();
      const effect = data.effect_entries.find(e => e.language.name === "en")?.effect || "No description available.";

      const caption = `
⚔️ *POKEMON MOVE* ⚔️

💥 *Name:* ${data.name.toUpperCase()}
🏷️ *Type:* ${data.type.name.toUpperCase()}
🎯 *Accuracy:* ${data.accuracy || "N/A"}
💪 *Power:* ${data.power || "N/A"}
🌀 *PP:* ${data.pp}

📝 *Effect:*
${effect}
`.trim();

      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch move info." }, { quoted: msg });
    }
  },
};
