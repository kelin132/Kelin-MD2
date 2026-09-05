/**
 * KELIN MD — .pokeability
 * Fetches info about a Pokemon ability.
 */
import fetch from "node-fetch";

export default {
  name: "pokeability",
  aliases: ["pokemonability", "pa"],
  description: "Get info about a Pokemon ability",
  category: "pokemon",
  usage: ".pokeability <name>",

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) return sock.sendMessage(jid, { text: "Usage: .pokeability <name> (e.g. Overgrow)" }, { quoted: msg });

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/ability/${text.toLowerCase().replace(/\s+/g, "-")}`);
      if (!res.ok) return sock.sendMessage(jid, { text: `❌ Ability *${text}* not found.` }, { quoted: msg });
      
      const data = await res.json();
      const effect = data.effect_entries.find(e => e.language.name === "en")?.effect || "No description available.";

      const caption = `
✨ *POKEMON ABILITY* ✨

🔮 *Name:* ${data.name.toUpperCase()}
📝 *Effect:*
${effect}
`.trim();

      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch ability info." }, { quoted: msg });
    }
  },
};
