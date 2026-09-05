// plugins/pokemon/unequip.js
// Unequip the Key Stone from a Pokémon

import { getTrainer, updateTrainer } from "../../lib/pokemon/players.mjs";
import { getAllTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "unequip",
  aliases: ["unequipitem", "removeitem"],
  description: "Unequip the Key Stone from a Pokémon",
  category: "pokemon",
  usage: ".unequip <pokémon name>",
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    if (!trainer.keystoneEquippedTo) {
      return sock.sendMessage(jid, {
        text: "❌ You don't have the Key Stone equipped on any Pokémon.",
      }, { quoted: msg });
    }

    // If a pokémon is specified, verify it's the holder
    if (args[0]) {
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

      if (found._id?.toString() !== trainer.keystoneEquippedTo) {
        const allPokemon2 = await getAllTrainerPokemon(sender);
        const holder      = allPokemon2.find(p => p._id?.toString() === trainer.keystoneEquippedTo);
        const holderName  = holder ? (holder.displayName || holder.name) : "another Pokémon";
        return sock.sendMessage(jid, {
          text: `❌ *${found.displayName || found.name}* doesn't hold the Key Stone.\nIt is currently equipped on *${holderName}*.`,
        }, { quoted: msg });
      }
    }

    // Unequip
    const allPokemon = await getAllTrainerPokemon(sender);
    const holder     = allPokemon.find(p => p._id?.toString() === trainer.keystoneEquippedTo);
    const holderName = holder ? (holder.displayName || holder.name) : "your Pokémon";

    await updateTrainer(sender, { keystoneEquippedTo: null });

    await sock.sendMessage(jid, {
      text:
`💎 *Key Stone removed from ${holderName}.*

The Key Stone is back in your bag.
Re-equip anytime with *.equip <pokémon>*`,
    }, { quoted: msg });
  },
};
