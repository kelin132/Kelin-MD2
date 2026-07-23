// plugins/pokemon/pc.js
// View PC storage (Pokémon not in party)

import { getTrainer } from "../../lib/pokemon/players.mjs";
import { getTrainerPC, getPokemonXpNeeded } from "../../lib/pokemon/pokemonDb.mjs";

const PAGE_SIZE = 10;

export default {
  name: "pc",
  aliases: ["storage", "box"],
  description: "View your PC Pokémon storage",
  category: "pokemon",
  usage: ".pc [page]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, { text: "❌ Start your journey first! Use *.startjourney*" }, { quoted: msg });
    }

    const page = Math.max(1, parseInt(args[0]) || 1);
    const pcPokemon = await getTrainerPC(sender);

    if (!pcPokemon || pcPokemon.length === 0) {
      return sock.sendMessage(jid, {
        text: "📦 *Your PC is empty!*\n\nCatch more Pokémon or use *.t2pc* to move them from party.",
      }, { quoted: msg });
    }

    const totalPages = Math.ceil(pcPokemon.length / PAGE_SIZE);
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = pcPokemon.slice(start, start + PAGE_SIZE);

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };

    const list = slice.map((p, i) => {
      const idx = start + i + 1;
      const typeIcon = typeEmojis[p.primaryType] || "⭐";
      const shinyTag = p.shiny ? " ✨" : "";
      const nick = p.nickname ? ` (${p.nickname})` : "";
      const xpNeeded = getPokemonXpNeeded(p.level);
      const xpText = xpNeeded > 0 ? `✨XP ${p.xp}/${xpNeeded}` : "✨MAX XP";
      return `${idx}. ${typeIcon} *${p.displayName || p.name}${nick}${shinyTag}* Lv.${p.level} ❤️${p.hp}/${p.maxHp} ${xpText}`;
    }).join("\n");

    await sock.sendMessage(jid, {
      text:
`📦 *PC STORAGE* (Page ${currentPage}/${totalPages})
Total: ${pcPokemon.length} Pokémon

${list}

Use *.t2party <name or #>* to move to party
Use *.pc <page>* for more pages`,
    }, { quoted: msg });
  },
};
