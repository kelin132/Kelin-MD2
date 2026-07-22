/**
 * KELIN MD — Pokémon Auto-Spawner
 * Automatically spawns a wild Pokémon every 10 minutes in groups where
 * autospawn is enabled via .pokespawn on/off
 */

import { fetchRandom }               from "../../lib/pokemon/api.mjs";
import { getWild, setWild }          from "../../lib/pokemon/wildState.mjs";
import { wildLevel, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";
import { getDb }                     from "../../lib/mongo.mjs";

const SPAWN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const COLLECTION        = "pokemon_autospawn_chats";

export async function getEnabledPokeChats() {
  const db = await getDb();
  const docs = await db.collection(COLLECTION).find({ enabled: true }).toArray();
  return docs.map(d => d._id);
}

const TYPE_EMOJIS = {
  fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
  flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
  fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
};

if (!global.__pokeAutoSpawnerRunning) {
  global.__pokeAutoSpawnerRunning = true;

  async function spawnInChat(sock, chatId) {
    // Don't overwrite an active wild Pokémon
    if (getWild(chatId)) return;

    let apiData;
    try { apiData = await fetchRandom(); } catch { return; }

    const level  = wildLevel(5); // level 2–8 range for auto-spawns
    const maxHp  = Math.max(10, Math.floor(apiData.baseHp * (1 + level * 0.05)));
    const wildPoke = {
      pokedexId:   apiData.pokedexId,
      name:        apiData.name,
      displayName: apiData.displayName,
      types:       apiData.types,
      primaryType: apiData.primaryType,
      level,
      hp:          maxHp,
      maxHp,
      attack:      Math.max(5, Math.floor(apiData.baseAttack  * (1 + level * 0.05))),
      defense:     Math.max(5, Math.floor(apiData.baseDefense * (1 + level * 0.05))),
      speed:       Math.max(5, Math.floor(apiData.baseSpeed   * (1 + level * 0.05))),
      imageUrl:    apiData.imageUrl,
      moves:       getMovesForType(apiData.primaryType, apiData.types),
    };

    setWild(chatId, wildPoke, null); // null = no specific triggering trainer

    const typeStr = apiData.types.map(t => `${TYPE_EMOJIS[t] || ""}${t}`).join(" / ");

    try {
      await sock.sendMessage(chatId, {
        image:   { url: apiData.imageUrl },
        caption:
`🌿 *A WILD POKÉMON APPEARED!*

🐾 Name: *${wildPoke.displayName}*
🏷️ Type: ${typeStr}
📊 Level: ${level}
❤️ HP: ${maxHp}/${maxHp}

Use *.catch* to battle this Pokémon!
⏰ It will flee in 30 minutes.`,
      });
    } catch (err) {
      console.error(`[pokeautospawn] Failed to send to ${chatId}:`, err?.message);
    }
  }

  async function runSpawnCycle() {
    try {
      const { getSocket } = await import("../../lib/bot.mjs");
      const sock = getSocket();
      if (!sock) return;

      const chats = await getEnabledPokeChats();
      for (const chatId of chats) {
        await spawnInChat(sock, chatId);
      }
    } catch (err) {
      console.error("[pokeautospawn] Cycle error:", err?.message);
    }
  }

  setInterval(runSpawnCycle, SPAWN_INTERVAL_MS);
  console.log("[pokeautospawn] Pokémon auto-spawner started (10 min interval)");
}

export default {
  name:        "_pokeautospawn",
  description: "Internal: auto Pokémon spawner",
  category:    "pokemon",
  run:         async () => {},
};
