// plugins/pokemon/equip.js
// Equip the Key Stone on one of your Pokémon
// Only one Pokémon can hold it at a time

import { getTrainer, updateTrainer, hasItem } from "../../lib/pokemon/players.mjs";
import { getAllTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "equip",
  aliases: ["equipitem", "holditem"],
  description: "Equip the Key Stone onto one of your Pokémon",
  category: "pokemon",
  usage: ".equip <pokémon name or number>",
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text:
`Usage: *.equip <pokémon name>*

The *💎 Key Stone* allows a Pokémon to Mega Evolve when using an evolution stone.

Example: \`.equip charizard\`
Unequip:  \`.unequip <pokémon name>\`

Buy the Key Stone at *.mart page 7*`,
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    // Check they own the keystone
    const owns = await hasItem(sender, "keystone");
    if (!owns) {
      return sock.sendMessage(jid, {
        text: "❌ You don't have a *💎 Key Stone*!\nBuy one at *.mart page 7*",
      }, { quoted: msg });
    }

    const pokemonQuery = args.join(" ").toLowerCase();
    const allPokemon   = await getAllTrainerPokemon(sender);

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

    const pokeName     = found.displayName || found.name;
    const currentHolder = trainer.keystoneEquippedTo;

    // Already equipped on this Pokémon
    if (currentHolder === found._id?.toString()) {
      return sock.sendMessage(jid, {
        text: `💎 *${pokeName}* already holds the Key Stone!\nUse *.unequip ${pokemonQuery}* to remove it.`,
      }, { quoted: msg });
    }

    // Move from a different Pokémon
    let swapMsg = "";
    if (currentHolder) {
      const prev = allPokemon.find(p => p._id?.toString() === currentHolder);
      if (prev) swapMsg = `\n_(Removed from *${prev.displayName || prev.name}*)_`;
    }

    await updateTrainer(sender, { keystoneEquippedTo: found._id?.toString() });

    await sock.sendMessage(jid, {
      text:
`💎 *Key Stone equipped on ${pokeName}!*${swapMsg}

${pokeName} can now *Mega Evolve* when you use an evolution stone.
Evolve: \`.evolve ${pokemonQuery} <stone>\`
Remove: \`.unequip ${pokemonQuery}\``,
    }, { quoted: msg });
  },
};
