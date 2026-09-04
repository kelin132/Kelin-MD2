/**
 * KELIN MD — Card Auto-Spawner
 * Every 15 minutes, drops a random card in every group that has spawning enabled.
 * Cards are fetched from the external Card API via lib/cardApi.mjs.
 * The global.activeSpawns object is shared with plugins/cards/claim.js.
 */

import { pickRandomCard, createSpawnId, buildCardSpawnCaption, sendCardMedia } from "./cardApi.mjs";
import { getSeries } from "./seriesEnrich.mjs";
import { getSocket }             from "./bot.mjs";
import { getEnabledSpawnChats }  from "../plugins/cards/db.js";
import { log }                   from "./logger.mjs";

const SPAWN_MIN_MS = 20 * 60 * 1000; // 20 minutes
const SPAWN_MAX_MS = 25 * 60 * 1000; // 25 minutes
const randSpawnMs  = () => SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS);

async function spawnCardInChat(sock, chatId, card) {
  const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

  // Don't overwrite an unclaimed spawn
  if (activeSpawns[chatId]) return;

  // Enrich series from AniList before displaying (4 s timeout)
  if (!card.series || card.series === "Unknown") {
    card.series = await getSeries(card.name, { timeout: 4000 });
  }

  // Store the full card object so claim.js doesn't need a DB lookup
  const spawnId = createSpawnId();
  activeSpawns[chatId] = { cardId: card.cardId, spawnId, card };

  const caption = buildCardSpawnCaption(card, spawnId);

  try {
    await sendCardMedia(sock, chatId, card, caption);

    // Auto-expire after 10 minutes if unclaimed
    setTimeout(() => {
      if (activeSpawns[chatId]?.spawnId === spawnId) {
        delete activeSpawns[chatId];
        sock.sendMessage(chatId, {
          text: `⏰ *${card.name}* was not claimed in time and vanished into the void...`,
        }).catch(() => {});
      }
    }, 10 * 60 * 1000);

  } catch (err) {
    delete activeSpawns[chatId];
    log("warn", `[cardSpawner] Failed to send to ${chatId}: ${err.message}`);
  }
}

async function runSpawnCycle() {
  try {
    const sock = getSocket();
    if (!sock) return;

    const chats = await getEnabledSpawnChats();
    if (!chats.length) return;

    for (const chatId of chats) {
      const card = await pickRandomCard();
      if (!card) continue;
      await spawnCardInChat(sock, chatId, card);
    }

    log("info", `[cardSpawner] Spawned cards in ${chats.length} chat(s)`);
  } catch (err) {
    log("warn", `[cardSpawner] Cycle error: ${err.message}`);
  }
}

export function startCardSpawner() {
  if (!global.activeSpawns) global.activeSpawns = {};

  log("info", "[cardSpawner] Started — spawning every 20–25 minutes (randomised)");
  function scheduleNext() {
    setTimeout(async () => { await runSpawnCycle(); scheduleNext(); }, randSpawnMs());
  }
  scheduleNext();
}
