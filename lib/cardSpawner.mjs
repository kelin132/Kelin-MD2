/**
 * KELIN MD — Card Auto-Spawner
 * Every 15 minutes, drops a random card in every group that has spawning enabled.
 * Uses weighted tier probability so Mythic cards are rarer than Common.
 * The global.activeSpawns object is shared with plugins/cards/claim.js.
 */

import { getDb }            from "./mongo.mjs";
import { getSocket }        from "./bot.mjs";
import { getEnabledSpawnChats } from "../plugins/cards/database.js";
import { log }              from "./logger.mjs";

const SPAWN_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// Weighted tier table — higher weight = more common
const TIER_WEIGHTS = [
  { tier: "Common",    weight: 45 },
  { tier: "Uncommon",  weight: 25 },
  { tier: "Rare",      weight: 15 },
  { tier: "Epic",      weight:  8 },
  { tier: "Legendary", weight:  5 },
  { tier: "Mythic",    weight:  2 },
];
const TOTAL_WEIGHT = TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);

function pickTier() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const { tier, weight } of TIER_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return "Common";
}

async function pickRandomCard() {
  const db   = getDb();
  const tier = pickTier();
  const col  = db.collection("mn_cards");

  // Count cards of this tier
  const count = await col.countDocuments({ tier, enabled: true });
  if (!count) {
    // Fallback to any enabled card
    const total = await col.countDocuments({ enabled: true });
    if (!total) return null;
    const skip = Math.floor(Math.random() * total);
    return col.findOne({ enabled: true }, { skip });
  }

  const skip = Math.floor(Math.random() * count);
  return col.findOne({ tier, enabled: true }, { skip });
}

async function spawnCardInChat(sock, chatId, card) {
  const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

  // Don't overwrite an unclaimed spawn
  if (activeSpawns[chatId]) return;

  activeSpawns[chatId] = { cardId: card.cardId };

  const caption =
`✨ *A CARD HAS APPEARED!* ✨

🃏 *${card.name}*
⭐ Tier: *${card.tier}*
🆔 ID: \`${card.cardId}\`

> Type *.claim ${card.cardId}* to grab it!
> First come, first served~`;

  try {
    if (card.media) {
      const msgOpts = card.mediaType === "video"
        ? { video: { url: card.media }, gifPlayback: true, caption }
        : { image: { url: card.media }, caption };
      await sock.sendMessage(chatId, msgOpts);
    } else {
      await sock.sendMessage(chatId, { text: caption });
    }

    // Auto-expire after 10 minutes if unclaimed
    setTimeout(() => {
      if (activeSpawns[chatId]?.cardId === card.cardId) {
        delete activeSpawns[chatId];
        sock.sendMessage(chatId, {
          text: `⏰ *${card.name}* was not claimed in time and vanished into the void...`,
        }).catch(() => {});
      }
    }, 10 * 60 * 1000);

  } catch (err) {
    // If send fails, clear so next cycle can try again
    delete activeSpawns[chatId];
    log("warn", `[cardSpawner] Failed to send to ${chatId}: ${err.message}`);
  }
}

async function runSpawnCycle() {
  try {
    const sock  = getSocket();
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
  // Initialise global spawn registry
  if (!global.activeSpawns) global.activeSpawns = {};

  log("info", "[cardSpawner] Started — spawning every 15 minutes");
  setInterval(runSpawnCycle, SPAWN_INTERVAL_MS);
}
