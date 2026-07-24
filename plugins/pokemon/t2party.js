// plugins/pokemon/t2party.js
// Transfer a Pokémon from PC to party

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerPC, getTrainerParty, updatePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { getDb } from "../../lib/mongo.mjs";

export default {
  name: "t2party",
  aliases: ["toparty", "withdraw"],
  description: "Transfer a Pokémon from PC to party",
  category: "pokemon",
  usage: ".t2party <pokemon name or PC slot number>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: "Usage: *.t2party <name or slot number>*\nExample: `.t2party pikachu` or `.t2party 1`\n\nUse *.pc* to see your stored Pokémon.",
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    // Check party size using getTrainerParty (inParty: true) for accuracy
    const party = await getTrainerParty(sender);
    if ((party || []).length >= 6) {
      return sock.sendMessage(jid, {
        text: `❌ Your party is full! (6/6)\nUse *.t2pc <name>* to move one out first.`,
      }, { quoted: msg });
    }

    const pc = await getTrainerPC(sender);
    if (!pc || pc.length === 0) {
      return sock.sendMessage(jid, { text: "📦 Your PC is empty!" }, { quoted: msg });
    }

    const query = args.join(" ").toLowerCase();
    let target;

    const slotNum = parseInt(query);
    if (!isNaN(slotNum) && slotNum >= 1 && slotNum <= pc.length) {
      target = pc[slotNum - 1];
    } else {
      target = pc.find(p =>
        p.name === query ||
        p.displayName?.toLowerCase() === query ||
        p.nickname?.toLowerCase() === query
      );
    }

    if (!target) {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't find *${query}* in your PC.\nUse *.pc* to see your stored Pokémon.`,
      }, { quoted: msg });
    }

    const pokemonIdStr = target._id.toString();

    // FIX: Directly update the trainer document in one atomic operation instead
    // of going through addToParty(), which has its own trainer.party.length guard
    // that can incorrectly block the transfer when stale IDs exist in the array.
    const db = await getDb();
    await db.collection("pokemon_trainers").updateOne(
      { jid: sender },
      {
        $pull:     { pc: pokemonIdStr },
        $addToSet: { party: pokemonIdStr },
      }
    );

    // Mark the Pokémon document as in-party
    await updatePokemon(target._id, { inParty: true });

    await sock.sendMessage(jid, {
      text: `🎒 *${target.displayName || target.name}* was added to your party! (${(party || []).length + 1}/6)\n\nUse *.party* to view your team.`,
    }, { quoted: msg });
  },
};
