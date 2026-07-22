// plugins/pokemon/party.js
// View your active battle party (up to 6 Pokémon)

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerParty } from "../../lib/pokemon/pokemonDb.mjs";

export default {
  name: "party",
  aliases: ["team", "lineup"],
  description: "View your active Pokémon party",
  category: "pokemon",
  usage: ".party",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const party = await getTrainerParty(sender);

    if (!party || party.length === 0) {
      return sock.sendMessage(jid, {
        text:
`🎒 *YOUR PARTY IS EMPTY!*

Use *.t2party <pokémon name>* to move Pokémon from PC.
Or use *.catch* to catch a wild Pokémon!`,
      }, { quoted: msg });
    }

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };

    const slots = party.map((p, i) => {
      const typeIcon = typeEmojis[p.primaryType] || "⭐";
      const shiny = p.shiny ? " ✨" : "";
      const nick = p.nickname ? ` "${p.nickname}"` : "";
      const hpBar = () => {
        const pct = p.hp / p.maxHp;
        if (pct > 0.5) return "🟩";
        if (pct > 0.2) return "🟨";
        if (p.hp > 0) return "🟥";
        return "💀";
      };
      const status = p.hp <= 0 ? " *(Fainted)*" : "";
      return `${i + 1}. ${typeIcon}${hpBar()} *${p.displayName || p.name}${nick}${shiny}*${status}\n   Lv.${p.level} ❤️${p.hp}/${p.maxHp} ⚔️${p.attack} 🛡️${p.defense}`;
    });

    const empty = 6 - party.length;
    const empties = Array(empty).fill("—").map((_, i) => `${party.length + i + 1}. ⬜ *Empty*`);

    await sock.sendMessage(jid, {
      text:
`🎒 *${trainer.username}'s PARTY* (${party.length}/6)

${[...slots, ...empties].join("\n")}

💰 Coins: ${trainer.coins}
🏆 Wins: ${trainer.wins} | Losses: ${trainer.losses}

*.t2party <name>* — Move from PC
*.t2pc <name>* — Move to PC
*.heal* — Heal party (${200} coins)`,
    }, { quoted: msg });
  },
};
