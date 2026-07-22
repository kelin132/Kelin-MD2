// plugins/pokemon/evolve.js
// Evolve a Pokémon using an evolution stone
// If the trainer has the Key Stone equipped on this Pokémon, it's a Mega Evolution!

import { getTrainer, removeItem, hasItem } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, getTrainerPC, evolvePokemon, getAllTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { getEvolutionByStone } from "../../lib/pokemon/gameLogic.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";

export default {
  name: "evolve",
  aliases: ["evo"],
  description: "Evolve a Pokémon using an evolution stone",
  category: "pokemon",
  usage: ".evolve <pokémon name or number> <stone>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text:
`Usage: *.evolve <pokémon> <stone>*

Example: \`.evolve pikachu thunderstone\`

Available stones:
firestone, waterstone, thunderstone, leafstone, moonstone, sunstone, icestone, shinystone, dawnstone, duskstone

💎 *Mega Evolution:* Equip the Key Stone on a Pokémon first (*.equip*), then use a stone to trigger Mega Evolution!

Buy stones at *.mart page 4*`,
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const stone       = args[args.length - 1].toLowerCase().replace(/\s/g, "");
    const pokemonQuery = args.slice(0, args.length - 1).join(" ").toLowerCase();

    // Check stone ownership
    const hasStone = await hasItem(sender, stone);
    if (!hasStone) {
      return sock.sendMessage(jid, {
        text: `❌ You don't have a *${stone}*!\nBuy one at *.mart page 4*`,
      }, { quoted: msg });
    }

    // Find the Pokémon in party or PC
    const allPokemon = await getAllTrainerPokemon(sender);
    const found = allPokemon.find(p =>
      p.name?.toLowerCase()        === pokemonQuery ||
      p.displayName?.toLowerCase() === pokemonQuery ||
      p.nickname?.toLowerCase()    === pokemonQuery ||
      p._id?.toString()            === pokemonQuery
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

    // Check if Mega Evolution (Key Stone equipped on this exact Pokémon)
    const pokeId     = found._id?.toString();
    const isMega     = trainer.keystoneEquippedTo === pokeId;

    // Consume the stone
    await removeItem(sender, stone, 1);

    // Evolve
    const evolved = await evolvePokemon(found._id, newData);

    // If Mega Evolution, apply a stat boost (20% to attack, defense, spatk)
    let megaBoostMsg = "";
    if (isMega) {
      const boostedAtk = Math.floor(evolved.attack  * 1.2);
      const boostedDef = Math.floor(evolved.defense * 1.2);
      await evolved.save?.().catch(() => {});
      try {
        const { updatePokemon } = await import("../../lib/pokemon/pokemonDb.mjs");
        await updatePokemon(evolved._id, { attack: boostedAtk, defense: boostedDef });
        evolved.attack  = boostedAtk;
        evolved.defense = boostedDef;
      } catch {}
      megaBoostMsg = `\n💎 *MEGA BONUS:* Attack & Defense ×1.2!`;
    }

    const pokeName    = found.displayName || found.name;
    const evolvedName = evolved.displayName || evolved.name;
    const titleLine   = isMega
      ? `💎✨ *MEGA EVOLUTION!*`
      : `✨ *EVOLUTION!*`;

    await sock.sendMessage(jid, {
      image: { url: newData.imageUrl },
      caption:
`${titleLine}

🐣 *${pokeName}* → 🌟 *${evolvedName}*!

📊 Level: ${evolved.level}
❤️ HP: ${evolved.hp}/${evolved.maxHp}
⚔️ Attack: ${evolved.attack}
🛡️ Defense: ${evolved.defense}
💨 Speed: ${evolved.speed}
🏷️ Type: ${(evolved.types || []).join(" / ")}${megaBoostMsg}

*Your Pokémon has evolved!* 🎉${isMega ? "\n💎 Key Stone power released — *Mega Evolution*!" : ""}`,
    }, { quoted: msg });
  },
};
