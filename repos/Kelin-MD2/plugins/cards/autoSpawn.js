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
import { pickRandomCard, createSpawnId, buildCardSpawnCaption, sendCardMedia } from "../../lib/cardApi.mjs";
import { getSeries } from "../../lib/seriesEnrich.mjs";
import { getEnabledSpawnChats }            from "./db.js";
import { log }                             from "../../lib/logger.mjs";
import { getPrefix }                       from "../../lib/bot.mjs";

const SPAWN_MIN_MS       = 20 * 60 * 1000; // 20 minutes
const SPAWN_MAX_MS       = 25 * 60 * 1000; // 25 minutes
const randSpawnMs        = () => SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);
const EXPIRE_MS          = 10 * 60 * 1000; // 10 minutes claim window

// Prevent double-starting if both this and the old cardSpawner are loaded
if (!global.__cardApiSpawnerRunning) {
  global.__cardApiSpawnerRunning = true;

  async function spawnCardInChat(sock, chatId, card) {
    const spawns = global.activeSpawns || (global.activeSpawns = {});
    if (spawns[chatId]) return; // don't overwrite unclaimed spawn

    // Enrich series from AniList before displaying (4 s timeout)
    if (!card.series || card.series === "Unknown") {
      card.series = await getSeries(card.name, { timeout: 4000 });
    }

    const spawnId = createSpawnId();
    spawns[chatId] = { cardId: card.cardId, spawnId, card };

    const caption = buildCardSpawnCaption(card, spawnId, getPrefix());

    try {
      await sendCardMedia(sock, chatId, card, caption);

      // Auto-expire
      setTimeout(() => {
        if (spawns[chatId]?.spawnId === spawnId) {
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

  // Start with a random 20–25 min interval, re-randomised each cycle
  function scheduleNext() {
    setTimeout(async () => { await runSpawnCycle(); scheduleNext(); }, randSpawnMs());
  }
  scheduleNext();
  log("info", "[autoSpawn] API-based card spawner initialised (20–25 min random)");
}

// Minimal plugin export — not a user-facing command
export default {
  name:        "_autospawn",
  description: "Internal: API card spawner",
  category:    "cards",
  run:         async () => {},
};
