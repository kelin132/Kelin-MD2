/**
 * KELIN MD — Card Auto-Spawner
 * Every 15 minutes, drops a random card in every group that has spawning enabled.
 * Cards are fetched from the external Card API via lib/cardApi.mjs.
 * The global.activeSpawns object is shared with plugins/cards/claim.js.
 */

import { pickRandomCard, resolveMediaUrl, createSpawnId } from "./cardApi.mjs";
import { getSocket }             from "./bot.mjs";
import { getEnabledSpawnChats }  from "../plugins/cards/db.js";
import { log }                   from "./logger.mjs";

const SPAWN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function spawnCardInChat(sock, chatId, card) {
  const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

  // Don't overwrite an unclaimed spawn
  if (activeSpawns[chatId]) return;

  // Store the full card object so claim.js doesn't need a DB lookup
  const spawnId = createSpawnId();
  activeSpawns[chatId] = { cardId: card.cardId, spawnId, card };

  const caption =
`✨ *A CARD HAS APPEARED!* ✨

🃏 *${card.name}*
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*
🆔 ID: \`${card.cardId}\`
🔹 Spawn ID: \`${spawnId}\`

> Type *.claim ${card.cardId}* to grab it!
> First come, first served~`;

  try {
    if (card.media) {
      const imgUrl = await resolveMediaUrl(card.media);
      await sock.sendMessage(chatId, {
        image:   { url: imgUrl },
        caption,
      });
    } else {
      await sock.sendMessage(chatId, { text: caption });
    }

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

  log("info", "[cardSpawner] Started — spawning every 15 minutes");
  setInterval(runSpawnCycle, SPAWN_INTERVAL_MS);
}
