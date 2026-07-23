// plugins/pokemon/spawnpokemon.js
// Mods/Owners: spawn a specific Pokémon in the group (or give to a user)

import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { getWild, setWild } from "../../lib/pokemon/wildState.mjs";
import { wildLevel, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";

export default {
  name: "spawnpokemon",
  aliases: ["spawnnpc", "modspawn"],
  description: "[Mod/Owner] Spawn a specific Pokémon by name or number",
  category: "pokemon",
  usage: ".spawnpokemon <name or number>",
  isMod: true,
  hidden: true,

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return sock.sendMessage(jid, {
        text: "Usage: *.spawnpokemon <name or number>*\nExample: `.spawnpokemon pikachu` or `.spawnpokemon 25`",
      }, { quoted: msg });
    }

    let apiData;
    try {
      apiData = await fetchPokemon(args[0]);
    } catch {
      return sock.sendMessage(jid, {
        text: `❌ Couldn't find a Pokémon named *${args[0]}*. Check the name and try again.`,
      }, { quoted: msg });
    }

    const level = parseInt(args[1]) || 20;
    const maxHp = Math.max(10, Math.floor(apiData.baseHp * (1 + level * 0.05)));
    const wildPoke = {
      pokedexId: apiData.pokedexId,
      name: apiData.name,
      displayName: apiData.displayName,
      types: apiData.types,
      primaryType: apiData.primaryType,
      level,
      hp: maxHp,
      maxHp,
      attack: Math.max(5, Math.floor(apiData.baseAttack * (1 + level * 0.05))),
      defense: Math.max(5, Math.floor(apiData.baseDefense * (1 + level * 0.05))),
      speed: Math.max(5, Math.floor(apiData.baseSpeed * (1 + level * 0.05))),
      imageUrl: apiData.imageUrl,
      moves: getMovesForType(apiData.primaryType, apiData.types),
    };

    setWild(jid, wildPoke, sender);

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };
    const typeStr = apiData.types.map(t => `${typeEmojis[t]||""}${t}`).join(" / ");

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`✨ *A SPECIAL POKÉMON WAS SUMMONED!*

🐾 Name: *${wildPoke.displayName}*
🏷️ Type: ${typeStr}
📊 Level: ${level}
❤️ HP: ${maxHp}/${maxHp}

Use *.catch* to battle this Pokémon!
⏰ It will flee in 30 minutes.`,
    }, { quoted: msg });
  },
};
