// plugins/pokemon/heal.js
// Heal all Pokémon in party — FREE, 150-second cooldown

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerParty, healParty } from "../../lib/pokemon/pokemonDb.mjs";
import { getBattle } from "../../lib/pokemon/battleState.mjs";

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

    // Block healing during an active battle (wild or PvP)
    const activeBattle = getBattle(jid);
    if (activeBattle) {
      const inBattle = activeBattle.challengerJid === sender || activeBattle.opponentJid === sender || activeBattle.trainerJid === sender;
      if (inBattle) {
        return sock.sendMessage(jid, {
          text: "❌ *You can't heal during a battle!*\n\nFinish or flee the battle first.",
        }, { quoted: msg });
      }
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

    const typeEmojis = { fire:"🌋",water:"🌊",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🪲",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"⚔️",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };

    const healed = party.map(p => {
      const icon = typeEmojis[p.primaryType] || "⭐";
      const name = (p.displayName || p.name || "???").padEnd(10);
      return `${icon} ${name} `;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`╭━━〔 🏥 *POKÉMON CENTER* 〕━━╮

💚 *HEALING COMPLETE!*

${healed}

💚 *ALL POKEMON HAVE BEEN HEALED*
⏳ Next heal: *150s*

╰━━━━━━━━━━━━━━━━━━╯`,
    }, { quoted: msg });
  },
};
