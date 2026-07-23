// plugins/pokemon/spawnpoke.js
// Spawn a random wild Pokémon in the group

import { fetchRandom } from "../../lib/pokemon/api.mjs";
import { getWild, setWild } from "../../lib/pokemon/wildState.mjs";
import { getTrainer } from "../../lib/pokemon/players.mjs";
import { wildLevel, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";

const SPAWN_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between spawns per group
const spawnCooldowns = new Map();

export default {
  name: "spawnpoke",
  aliases: ["wildpoke", "encounter"],
  description: "Spawn a random wild Pokémon in the group",
  category: "pokemon",
  usage: ".spawnpoke",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const trainer = await getTrainer(sender);
    if (!trainer) {
      return sock.sendMessage(jid, {
        text: "❌ You haven't started your journey yet!\nUse *.startjourney* to begin.",
      }, { quoted: msg });
    }

    // Check if a wild Pokémon is already present
    if (getWild(jid)) {
      return sock.sendMessage(jid, {
        text: "⚠️ A wild Pokémon is already here!\nUse *.catch* to fight it.",
      }, { quoted: msg });
    }

    // Cooldown check (non-mods)
    const lastSpawn = spawnCooldowns.get(jid) || 0;
    if (Date.now() - lastSpawn < SPAWN_COOLDOWN_MS) {
      const remaining = Math.ceil((SPAWN_COOLDOWN_MS - (Date.now() - lastSpawn)) / 1000);
      return sock.sendMessage(jid, {
        text: `⏳ Wild Pokémon spawn cooldown! Wait *${remaining}s* before spawning again.`,
      }, { quoted: msg });
    }

    let apiData;
    try {
      apiData = await fetchRandom();
    } catch {
      return sock.sendMessage(jid, { text: "❌ Couldn't fetch a Pokémon right now. Try again!" }, { quoted: msg });
    }

    const level = wildLevel(trainer.level || 1);
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

    setWild(jid, wildPoke, sender, (pokeName) => {
      // Send "fled away" message when the 30-min timer fires
      sock.sendMessage(jid, {
        text: `🌿 *${pokeName}* got tired of waiting and *fled away!* 🏃\nUse *.spawnpoke* to encounter a new wild Pokémon.`,
      }).catch(() => {});
    });
    spawnCooldowns.set(jid, Date.now());

    const typeEmojis = { fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",
      normal:"⭐",flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",
      ice:"❄️",fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸" };
    const typeStr = apiData.types.map(t => `${typeEmojis[t]||""}${t}`).join(" / ");

    await sock.sendMessage(jid, {
      image: { url: apiData.imageUrl },
      caption:
`🌿 *A WILD POKÉMON APPEARED!*

🐾 Name: *${wildPoke.displayName}*
🏷️ Type: ${typeStr}
📊 Level: ${level}
❤️ HP: ${maxHp}/${maxHp}

Use *.catch* to battle this Pokémon!
⏰ It will flee in 30 minutes.`,
    }, { quoted: msg });
  },
};
