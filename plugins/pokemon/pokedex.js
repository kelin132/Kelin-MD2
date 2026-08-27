import axios from "axios";

export default {
  name: "pokedex",
  aliases: ["pokeinfo", "dex"],
  category: "pokemon",
  description: "Get detailed information about a Pokémon",
  usage: ".pokedex <pokemon_name>",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    
    const query = args[0]?.toLowerCase();
    if (!query) return reply("❌ Please provide a Pokémon name.");

    try {
      const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
      
      const stats = data.stats.map(s => `• *${s.stat.name.toUpperCase()}:* ${s.base_stat}`).join("\n");
      const types = data.types.map(t => t.type.name.toUpperCase()).join(", ");
      const abilities = data.abilities.map(a => a.ability.name).join(", ");
      
      const caption = `
📕 *POKEDEX: #${data.id} ${data.name.toUpperCase()}* 📕
━━━━━━━━━━━━━━━━━━━━━
🏷️ *Types:* ${types}
📏 *Height:* ${data.height / 10}m
⚖️ *Weight:* ${data.weight / 10}kg
✨ *Abilities:* ${abilities}

📊 *Base Stats:*
${stats}
━━━━━━━━━━━━━━━━━━━━━
`;

      return sock.sendMessage(jid, {
        image: { url: data.sprites.other['official-artwork'].front_default || data.sprites.front_default },
        caption
      }, { quoted: msg });

    } catch (err) {
      return reply("❌ Pokémon not found. Check the spelling!");
    }
  },
};
