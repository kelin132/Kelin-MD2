// plugins/pokemon/evolve.js
// Evolve a Pokémon using an evolution stone

import { getTrainer, removeItem, hasItem } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, getTrainerPC, evolvePokemon, getAllTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { getEvolutionByStone } from "../../lib/pokemon/gameLogic.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";

export default {
  name: "evolve",
  aliases: ["evo"],
  description: "Evolve a Pokémon using an evolution stone",
  category: "pokemon",
  usage: ".evolve <pokemon name or number> <stone>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text:
`Usage: *.evolve <pokémon> <stone>*

Example: \`.evolve pikachu thunderstone\`

Available stones: firestone, waterstone, thunderstone, leafstone, moonstone, sunstone, icestone, shinystone, dawnstone, duskstone

Buy stones at *.mart*`,
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const stone = args[args.length - 1].toLowerCase().replace(/\s/g, "");
    const pokemonQuery = args.slice(0, args.length - 1).join(" ").toLowerCase();

    // Check stone ownership
    const hasStone = await hasItem(sender, stone);
    if (!hasStone) {
      return sock.sendMessage(jid, {
        text: `❌ You don't have a *${stone}*!\nBuy one at *.mart*`,
      }, { quoted: msg });
    }

    // Find the Pokémon in party or PC
    const allPokemon = await getAllTrainerPokemon(sender);
    const found = allPokemon.find(p =>
      p.name === pokemonQuery ||
      p.displayName?.toLowerCase() === pokemonQuery ||
      p.nickname?.toLowerCase() === pokemonQuery ||
      p._id?.toString() === pokemonQuery
    );

    if (!found) {
      return sock.sendMessage(jid, {
        text: `❌ You don't have a Pokémon named *${pokemonQuery}*.\nUse *.party* or *.pc* to see your Pokémon.`,
      }, { quoted: msg });
    }

    // Check evolution compatibility
    const evolvesTo = getEvolutionByStone(found.name, stone);
    if (!evolvesTo) {
      return sock.sendMessage(jid, {
        text: `❌ *${found.displayName || found.name}* cannot evolve using a *${stone}*!`,
      }, { quoted: msg });
    }

    // Fetch evolved form data
    let newData;
    try {
      newData = await fetchPokemon(evolvesTo);
    } catch {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't fetch evolution data for *${evolvesTo}*. Try again!`,
      }, { quoted: msg });
    }

    // Consume the stone
    await removeItem(sender, stone, 1);

    // Evolve
    const evolved = await evolvePokemon(found._id, newData);

    await sock.sendMessage(jid, {
      image: { url: newData.imageUrl },
      caption:
`✨ *EVOLUTION!*

🐣 ${found.displayName || found.name} → 🌟 *${evolved.displayName}*!

📊 Level: ${evolved.level}
❤️ HP: ${evolved.hp}/${evolved.maxHp}
⚔️ Attack: ${evolved.attack}
🛡️ Defense: ${evolved.defense}
💨 Speed: ${evolved.speed}
🏷️ Type: ${(evolved.types || []).join(" / ")}

*Your Pokémon has evolved!* 🎉`,
    }, { quoted: msg });
  },
};
