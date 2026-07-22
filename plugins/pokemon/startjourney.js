// plugins/pokemon/startjourney.js
// Begin a trainer's Pokémon journey and receive a starter Pokémon

import { getTrainer, createTrainer } from "../../lib/pokemon/players.mjs";
import { fetchPokemon } from "../../lib/pokemon/api.mjs";
import { buildPokemon, savePokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { addToParty, updateTrainer } from "../../lib/pokemon/players.mjs";

const STARTERS = [
  { id: 1,   name: "bulbasaur"  },
  { id: 4,   name: "charmander" },
  { id: 7,   name: "squirtle"   },
  { id: 152,  name: "chikorita"  },
  { id: 155,  name: "cyndaquil"  },
  { id: 158,  name: "totodile"   },
  { id: 252,  name: "treecko"    },
  { id: 255,  name: "torchic"    },
  { id: 258,  name: "mudkip"     },
  { id: 387,  name: "turtwig"    },
  { id: 390,  name: "chimchar"   },
  { id: 393,  name: "piplup"     },
  { id: 495,  name: "snivy"      },
  { id: 498,  name: "tepig"      },
  { id: 501,  name: "oshawott"   },
  { id: 650,  name: "chespin"    },
  { id: 653,  name: "fennekin"   },
  { id: 656,  name: "froakie"    },
];

export default {
  name: "startjourney",
  aliases: ["pokéstart", "pokestart"],
  description: "Begin your Pokémon journey and receive a starter Pokémon",
  category: "pokemon",
  usage: ".startjourney",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const existing = await getTrainer(sender);
    if (existing) {
      return sock.sendMessage(jid, {
        text: `🎮 You already started your Pokémon journey!\n\nUse *.party* to see your team or *.pokeinfo [name]* to look up Pokémon.`,
      }, { quoted: msg });
    }

    const username = msg.pushName || "Trainer";

    // Pick a random starter
    const choice = STARTERS[Math.floor(Math.random() * STARTERS.length)];

    let apiData;
    try {
      apiData = await fetchPokemon(choice.id);
    } catch {
      // Fallback: try by name
      try { apiData = await fetchPokemon(choice.name); } catch (e) {
        return sock.sendMessage(jid, { text: "❌ Couldn't fetch starter Pokémon. Please try again!" }, { quoted: msg });
      }
    }

    const trainer = await createTrainer(sender, username);
    const starter = buildPokemon(apiData, sender, 5, true);
    await savePokemon(starter);
    await addToParty(sender, starter._id.toString());

    const typeEmojis = { fire:"🔥", water:"💧", grass:"🍃", electric:"⚡", psychic:"🔮",
      normal:"⭐", flying:"🌤️", bug:"🐛", poison:"☠️", rock:"🪨", ground:"🌍",
      ice:"❄️", fighting:"🥊", ghost:"👻", dragon:"🐉", dark:"🌑", steel:"⚙️", fairy:"🌸" };
    const typeStr = (apiData.types || []).map(t => `${typeEmojis[t] || ""}${t}`).join(" / ");
    const shinyTag = starter.shiny ? "\n✨ *WOW! Your starter is SHINY!*" : "";

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`🎮 *POKÉMON JOURNEY STARTED!*${shinyTag}

👤 Trainer: *${username}*
🌟 Starter: *${starter.displayName}*
🏷️ Type: ${typeStr}
❤️ HP: ${starter.hp}/${starter.maxHp}
⚔️ Attack: ${starter.attack}
🛡️ Defense: ${starter.defense}
💨 Speed: ${starter.speed}
📊 Level: ${starter.level}

💰 Starting Coins: ${trainer.coins}
🎾 Starter Pokéballs: 3

*Your adventure begins!* 🌟
Use *.spawnpoke* to find wild Pokémon
Use *.party* to view your team
Use *.mart* to visit the shop
Use *.heal* to heal your Pokémon`,
    }, { quoted: msg });
  },
};
