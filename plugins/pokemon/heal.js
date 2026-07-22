// plugins/pokemon/heal.js
// Heal all Pokémon in party — FREE, 150-second cooldown

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, healParty } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "heal",
  aliases: ["pokecenter", "healparty"],
  description: "Heal all Pokémon in your party (free, 150s cooldown)",
  category: "pokemon",
  usage: ".heal",
  cooldown: 150,

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
        text: "✅ All your Pokémon are already at full health!\n⏳ Next free heal in 150 seconds.",
      }, { quoted: msg });
    }

    await healParty(sender);

    const healed = party.map(p => `  🐉 ${p.displayName || p.name} — ❤️ FULL`).join("\n");

    await sock.sendMessage(jid, {
      text:
`🏥 *POKÉMON CENTER*

Your Pokémon have been fully healed! 💚

${healed}

💚 *Healing is free!*
⏳ Next free heal available in *150 seconds*.`,
    }, { quoted: msg });
  },
};
