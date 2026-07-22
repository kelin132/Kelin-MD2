// plugins/pokemon/heal.js
// Heal all Pokémon in party (costs coins or uses a Pokémon Center)

import { getTrainer, addCoins } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, healParty } from "../../lib/pokemon/pokemonDb.mjs";

const HEAL_COST = 200; // coins per heal

export default {
  name: "heal",
  aliases: ["pokecenter", "healparty"],
  description: "Heal all Pokémon in your party",
  category: "pokemon",
  usage: ".heal",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);
    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text: "❌ Your party is empty! Use *.t2party* to add Pokémon.",
      }, { quoted: msg });
    }

    const allHealthy = party.every(p => p.hp >= p.maxHp);
    if (allHealthy) {
      return sock.sendMessage(jid, {
        text: "✅ All your Pokémon are already at full health!",
      }, { quoted: msg });
    }

    if ((trainer.coins || 0) < HEAL_COST) {
      return sock.sendMessage(jid, {
        text: `❌ Not enough coins! Healing costs *${HEAL_COST} coins*.\nYou have: *${trainer.coins} coins*`,
      }, { quoted: msg });
    }

    await healParty(sender);
    await addCoins(sender, -HEAL_COST);

    const healed = party.map(p => `  🐉 ${p.displayName || p.name} — ❤️ FULL`).join("\n");

    await sock.sendMessage(jid, {
      text:
`🏥 *POKÉMON CENTER*

Your Pokémon have been fully healed! 💚

${healed}

💰 Paid: *${HEAL_COST} coins*
💰 Remaining: *${(trainer.coins - HEAL_COST)} coins*`,
    }, { quoted: msg });
  },
};
