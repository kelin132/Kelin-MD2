/**
 * KELIN MD — Card Auto-Spawner
 * Drops a random card in every group that has spawn enabled,
 * every 15 minutes. Only starts if RAPIDAPI_KEY is set.
 *
 * Usage (called from index.js after bot connects):
 *   import { startCardSpawner } from "./lib/cardSpawner.mjs";
 *   startCardSpawner(sock);
 *
 * The spawner re-reads the socket reference on each tick so it
 * handles reconnects gracefully (bot.mjs exposes getSocket()).
 */

import { log } from "./logger.mjs";
import { getSocket } from "./bot.mjs";
import {
  fetchRandomCard,
  fetchCardImage,
  createDrop,
  getAllSpawnEnabledChats,
} from "../plugins/cards/database.js";

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let spawnerTimer = null;

function buildSpawnCaption(card) {
  const tierStars = {
    "Tier S": "⭐⭐⭐⭐⭐ *S*",
    "Tier 1": "⭐⭐⭐⭐",
    "Tier 2": "⭐⭐⭐",
    "Tier 3": "⭐⭐",
    "Tier 4": "⭐",
    "Tier 5": "✦",
    "Tier 6": "✧",
  };
  return `🃏 *A WILD CARD APPEARED!*

📛 *Name*   : ${card.name}
📚 *Series* : ${card.series}
🏆 *Tier*   : ${tierStars[card.tier] ?? card.tier}

⚡ Quick! Type *.collect* to claim this card!
🕐 First one to grab it wins!`;
}

async function spawnTick() {
  const sock = getSocket();
  if (!sock) {
    log("warn", "[CardSpawner] Socket not ready — skipping tick.");
    return;
  }

  let chats;
  try {
    chats = await getAllSpawnEnabledChats();
  } catch (err) {
    log("warn", "[CardSpawner] Could not fetch spawn-enabled chats: " + String(err));
    return;
  }

  if (!chats.length) return;

  log("info", `[CardSpawner] Spawning cards in ${chats.length} group(s)…`);

  for (const chatId of chats) {
    try {
      const card = await fetchRandomCard();

      let drop;
      try {
        drop = await createDrop(chatId, card, "system");
      } catch (err) {
        if (err.message === "ALREADY_ACTIVE") {
          // Previous card not yet collected — skip this group
          continue;
        }
        throw err;
      }

      const caption = buildSpawnCaption(card);

      try {
        const imgBuf = await fetchCardImage(card.cdn);
        if (card.type === "gif") {
          await sock.sendMessage(chatId, { video: imgBuf, gifPlayback: true, caption });
        } else {
          await sock.sendMessage(chatId, { image: imgBuf, caption });
        }
      } catch {
        // Image failed — send text fallback so the drop is still claimable
        await sock.sendMessage(chatId, { text: caption });
      }

      log("info", `[CardSpawner] Spawned "${card.name}" (${card.tier}) in ${chatId}`);
    } catch (err) {
      log("warn", `[CardSpawner] Failed for ${chatId}: ${err.message}`);
    }

    // Small delay between groups to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/**
 * Start the card spawner. Safe to call multiple times — only one timer runs.
 */
export function startCardSpawner() {
  if (!process.env.RAPIDAPI_KEY) {
    log("warn", "[CardSpawner] RAPIDAPI_KEY not set — card spawner disabled.");
    return;
  }

  if (spawnerTimer) return; // already running

  log("info", `[CardSpawner] Started — cards will spawn every 15 minutes in enabled groups.`);

  spawnerTimer = setInterval(() => {
    spawnTick().catch((err) =>
      log("error", "[CardSpawner] Unexpected error: " + String(err))
    );
  }, INTERVAL_MS);
}

export function stopCardSpawner() {
  if (spawnerTimer) {
    clearInterval(spawnerTimer);
    spawnerTimer = null;
    log("info", "[CardSpawner] Stopped.");
  }
}
