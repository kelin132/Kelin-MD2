// plugins/pokemon/t2pc.js
// Transfer a Pokémon from party to PC

import { getTrainer, removeFromParty, addToPC } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, updatePokemon } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "t2pc",
  aliases: ["topc", "deposit"],
  description: "Transfer a Pokémon from party to PC",
  category: "pokemon",
  usage: ".t2pc <pokemon name or slot number>",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: "Usage: *.t2pc <name or slot number>*\nExample: `.t2pc pikachu` or `.t2pc 2`\n\nUse *.party* to see your slots.",
      }, { quoted: msg });
    }

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, { text: "❌ Your party is empty!" }, { quoted: msg });
    }

    if (party.length === 1) {
      return sock.sendMessage(jid, {
        text: "❌ You can't move your last Pokémon to PC!\nYou need at least one in your party.",
      }, { quoted: msg });
    }

    const query = args.join(" ").toLowerCase();
    let target;

    // Try slot number first
    const slotNum = parseInt(query);
    if (!isNaN(slotNum) && slotNum >= 1 && slotNum <= party.length) {
      target = party[slotNum - 1];
    } else {
      target = party.find(p =>
        p.name === query ||
        p.displayName?.toLowerCase() === query ||
        p.nickname?.toLowerCase() === query
      );
    }

    if (!target) {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't find *${query}* in your party.\nUse *.party* to see your Pokémon.`,
      }, { quoted: msg });
    }

    // Block moving the starter to PC
    if (target.isStarter) {
      const pokeName = target.displayName || target.name;
      return sock.sendMessage(jid, {
        text: `❌ *${pokeName}* is your Starter Pokémon — it must stay in your party at all times!\n\n🏅 Your starter is a lifelong partner and cannot be moved to PC.`,
      }, { quoted: msg });
    }

    await removeFromParty(sender, target._id.toString());
    await addToPC(sender, target._id.toString());
    await updatePokemon(target._id, { inParty: false });

    await sock.sendMessage(jid, {
      text: `📦 *${target.displayName || target.name}* was moved to your PC!\n\nUse *.t2party <name>* to bring them back.`,
    }, { quoted: msg });
  },
};
