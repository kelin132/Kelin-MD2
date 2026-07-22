// plugins/pokemon/pokeinfo.js
// Look up info about any Pokémon

import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { getEvolutionByStone, STONE_EVOLUTIONS } from "../../lib/pokemon/gameLogic.mjs";

export default {
  name: "pokeinfo",
  aliases: ["pokedex", "pkinfo", "dex"],
  description: "Look up info about any Pokémon",
  category: "pokemon",
  usage: ".pokeinfo <name or number>",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: "Usage: *.pokeinfo <name or number>*\nExample: `.pokeinfo pikachu` or `.pokeinfo 25`",
      }, { quoted: msg });
    }

    let apiData;
    try {
      apiData = await fetchPokemon(args.join(" "));
    } catch {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't find Pokémon *${args.join(" ")}*. Check spelling and try again.`,
      }, { quoted: msg });
    }

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };

    const typeStr = (apiData.types || []).map(t => `${typeEmojis[t] || ""}${t}`).join(" / ");

    // Check stone evolution
    const stoneKey = apiData.name?.toLowerCase().trim();
    const stoneEvo = STONE_EVOLUTIONS[stoneKey];
    let evoText = "";
    if (stoneEvo) {
      if (Array.isArray(stoneEvo)) {
        evoText = "\n🪨 *Stone Evolutions:*\n" + stoneEvo.map(e => `  ${e.stone} → ${e.evolvesTo}`).join("\n");
      } else {
        evoText = `\n🪨 *Stone Evolution:* ${stoneEvo.stone} → ${stoneEvo.evolvesTo}`;
      }
    }

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`📖 *POKÉDEX — #${apiData.pokedexId}*

🐾 *${apiData.displayName}*
🏷️ Type: ${typeStr}

📊 *Base Stats:*
❤️ HP: ${apiData.baseHp}
⚔️ Attack: ${apiData.baseAttack}
🛡️ Defense: ${apiData.baseDefense}
✨ Sp.Atk: ${apiData.baseSpAtk}
💨 Speed: ${apiData.baseSpeed}
📏 Height: ${(apiData.height / 10).toFixed(1)}m
⚖️ Weight: ${(apiData.weight / 10).toFixed(1)}kg${evoText}

_Stats scale with level when caught._`,
    }, { quoted: msg });
  },
};
