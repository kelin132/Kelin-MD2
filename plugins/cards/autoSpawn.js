/**
 * KELIN MD — autoSpawn.js
 * Self-starting card spawner loaded as a plugin.
 * Replaces the need for cardSpawner.mjs to be updated on the panel —
 * since this is a NEW file, the panel picks it up automatically.
 *
 * Cards are fetched from the external Card API via lib/cardApi.mjs.
 * Runs independently of (and duplicates) cardSpawner.mjs if both are active;
 * the guard `global.__cardApiSpawnerRunning` prevents double-spawning.
 */
import { pickRandomCard, resolveMediaUrl } from "../../lib/cardApi.mjs";
import { getEnabledSpawnChats }            from "./db.js";
import { log }                             from "../../lib/logger.mjs";

const SPAWN_INTERVAL_MS  = 15 * 60 * 1000; // 15 minutes
const EXPIRE_MS          = 10 * 60 * 1000; // 10 minutes claim window

// Prevent double-starting if both this and the old cardSpawner are loaded
if (!global.__cardApiSpawnerRunning) {
  global.__cardApiSpawnerRunning = true;

  async function spawnCardInChat(sock, chatId, card) {
    const spawns = global.activeSpawns || (global.activeSpawns = {});
    if (spawns[chatId]) return; // don't overwrite unclaimed spawn

    spawns[chatId] = { cardId: card.cardId, card };

    const caption =
`✨ *A CARD HAS APPEARED!* ✨

🃏 *${card.name}*
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*
🆔 ID: \`${card.cardId}\`

> Type *.claim ${card.cardId}* to grab it!
> First come, first served — expires in 10 min~`;

    try {
      const imgUrl = card.media ? await resolveMediaUrl(card.media) : null;
      if (imgUrl) {
        await sock.sendMessage(chatId, { image: { url: imgUrl }, caption });
      } else {
        await sock.sendMessage(chatId, { text: caption });
      }

      // Auto-expire
      setTimeout(() => {
        if (spawns[chatId]?.cardId === card.cardId) {
          delete spawns[chatId];
          sock.sendMessage(chatId, {
            text: `⏰ *${card.name}* was not claimed in time and vanished...`,
          }).catch(() => {});
        }
      }, EXPIRE_MS);

    } catch (err) {
      delete spawns[chatId];
      log("warn", `[autoSpawn] Failed to send to ${chatId}: ${err.message}`);
    }
  }

  async function runSpawnCycle() {
    try {
      // Dynamically import getSocket to avoid circular-dep at load time
      const { getSocket } = await import("../../lib/bot.mjs");
      const sock = getSocket();
      if (!sock) return;

      const chats = await getEnabledSpawnChats();
      if (!chats.length) return;

      for (const chatId of chats) {
        const card = await pickRandomCard();
        if (!card) continue;
        await spawnCardInChat(sock, chatId, card);
      }

      log("info", `[autoSpawn] Spawned in ${chats.length} chat(s)`);
    } catch (err) {
      log("warn", `[autoSpawn] Cycle error: ${err.message}`);
    }
  }

  // Start the interval as soon as this plugin is loaded
  setInterval(runSpawnCycle, SPAWN_INTERVAL_MS);
  log("info", "[autoSpawn] API-based card spawner initialised");
}

// Minimal plugin export — not a user-facing command
export default {
  name:        "_autospawn",
  description: "Internal: API card spawner",
  category:    "cards",
  run:         async () => {},
};
