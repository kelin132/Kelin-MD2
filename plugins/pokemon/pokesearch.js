/**
 * KELIN MD — .pokesearch command
 * Search for Pokémon info using PokeAPI.
 */

export default {
  name: "pokesearch",
  description: "Search for Pokémon information",
  category: "pokemon",
  usage: ".pokesearch <pokemon name/id>",
  aliases: ["psearch", "pokeinfo"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text: "🎮 *Pokémon Search*\n\nUsage: *.pokesearch <name/id>*\nExample: *.pokesearch pikachu*"
      }, { quoted: msg });
    }

    const query = text.trim().toLowerCase();
    
    try {
      await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
      
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
      if (!res.ok) throw new Error("Pokémon not found.");
      
      const data = await res.json();
      
      const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      const types = data.types.map(t => t.type.name.toUpperCase()).join(", ");
      const stats = data.stats.map(s => `• ${s.stat.name.toUpperCase()}: ${s.base_stat}`).join("\n");
      const abilities = data.abilities.map(a => a.ability.name).join(", ");
      
      const caption = `🎮 *POKÉMON INFO: ${name} (#${data.id})*\n\n` +
        `✨ *Type:* ${types}\n` +
        `📏 *Height:* ${data.height / 10}m | ⚖️ *Weight:* ${data.weight / 10}kg\n` +
        `🧬 *Abilities:* ${abilities}\n\n` +
        `📊 *Base Stats:*\n${stats}`;
      
      const imageUrl = data.sprites.other["official-artwork"].front_default || data.sprites.front_default;
      
      await sock.sendMessage(jid, { image: { url: imageUrl }, caption }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
