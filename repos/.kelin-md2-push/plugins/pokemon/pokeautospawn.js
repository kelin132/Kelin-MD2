/**
 * KELIN MD — Pokémon Auto-Spawner
 * Automatically spawns a wild Pokémon every 10 minutes in groups where
 * autospawn is enabled via .pokespawn on/off
 */

import { fetchRandom, getImageMessage } from "../../lib/pokemon/api.mjs";
import { getWild, setWild }          from "../../lib/pokemon/wildState.mjs";
import { randomWildLevel, getMovesForType } from "../../lib/pokemon/gameLogic.mjs";
import { getDb }                     from "../../lib/mongo.mjs";
import { getPrefix }                 from "../../lib/bot.mjs";
import { getRepel }                  from "../../lib/pokemon/itemState.mjs";

const SPAWN_MIN_MS = 15 * 60 * 1000; // 15 minutes
const SPAWN_MAX_MS = 20 * 60 * 1000; // 20 minutes
const randSpawnMs  = () => SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
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
    if (getRepel(chatId)) return;

    let apiData;
    try { apiData = await fetchRandom(); } catch { return; }

    const level  = randomWildLevel(); // level 5–10 range for auto-spawns
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

    setWild(chatId, wildPoke, null, (pokeName) => {
      // Send "fled away" message when the 30-min timer fires
      sock.sendMessage(chatId, {
        text: `🌿 *${pokeName}* got tired of waiting and *fled away!* 🏃\nNo one caught it in time.`,
      }).catch(() => {});
    });

    const typeStr = apiData.types.map(t => `${TYPE_EMOJIS[t] || ""}${t}`).join(" / ");

    const autoCaption =
`🌿 *A WILD POKÉMON APPEARED!*

🐾 Name: *${wildPoke.displayName}*
🏷️ Type: ${typeStr}
📊 Level: ${level}
❤️ HP: ${maxHp}/${maxHp}

Use *${getPrefix()}catch* to battle this Pokémon!
⏰ It will flee in 30 minutes.`;

    // Try with image; if URL is missing or CDN fails, send text-only so the spawn isn't lost
    // Use local sprite file when available (no CDN); falls back to URL, then text-only
    const imgMsg = await getImageMessage(apiData);
    let sent = false;
    if (imgMsg) {
      try {
        await sock.sendMessage(chatId, { ...imgMsg, caption: autoCaption });
        sent = true;
      } catch (err) {
        console.error(`[pokeautospawn] Image send failed for ${chatId}, falling back to text:`, err?.message);
      }
    }
    if (!sent) {
      try {
        await sock.sendMessage(chatId, { text: autoCaption });
      } catch (err) {
        console.error(`[pokeautospawn] Text fallback also failed for ${chatId}:`, err?.message);
      }
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

  function scheduleNext() {
    setTimeout(async () => { await runSpawnCycle(); scheduleNext(); }, randSpawnMs());
  }
  scheduleNext();
  console.log("[pokeautospawn] Pokémon auto-spawner started (15–20 min random interval)");
}

export default {
  name:        "_pokeautospawn",
  description: "Internal: auto Pokémon spawner",
  category:    "pokemon",
  run:         async () => {},
};
