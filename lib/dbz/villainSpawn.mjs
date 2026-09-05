/**
 * KELIN MD — DBZ Villain spawn logic (lib/dbz/villainSpawn.mjs)
 * Parallel to lib/pokemon/wildState.mjs + pokeautospawn.js logic.
 * Used by plugins/dbz/dbzautospawn.js.
 */

import { getRandomVillain, getAllVillains } from "./api.mjs";
import { setVillain, hasVillain } from "./villainState.mjs";
import { villainLevel, scaleStatsToLevel, MAX_BATTLE_KI } from "./gameLogic.mjs";
import { getDb } from "../mongo.mjs";
import { getPrefix } from "../bot.mjs";

export const SPAWN_COLLECTION = "dbz_autospawn_chats";

// Named boss villains — louder caption, stat multiplier boost
const BOSS_NAMES = new Set([
  "Freezer", "Celula", "Majin Buu", "Beerus", "Broly", "Janemba",
  "Jiren", "Raditz", "Zarbon",
]);
const BOSS_ROLL_CHANCE = 0.12; // 12% chance to pick a boss
const BOSS_STAT_MULT   = 1.45;

/** Get the list of group chat IDs where DBZ autospawn is enabled. */
export async function getEnabledDbzChats() {
  const db   = getDb();
  const docs = await db.collection(SPAWN_COLLECTION).find({ enabled: true }).toArray();
  return docs.map(d => d._id);
}

/** Enable or disable DBZ autospawn for a chat. */
export async function setDbzAutospawn(chatId, enabled) {
  const db = getDb();
  await db.collection(SPAWN_COLLECTION).updateOne(
    { _id: chatId },
    { $set: { _id: chatId, enabled } },
    { upsert: true }
  );
}

/** Check if DBZ autospawn is enabled for a chat. */
export async function isDbzAutospawnEnabled(chatId) {
  const db  = getDb();
  const doc = await db.collection(SPAWN_COLLECTION).findOne({ _id: chatId });
  return !!(doc?.enabled);
}

/**
 * Spawn a villain in the given chat via sock.sendMessage.
 * Returns true if a villain was spawned, false otherwise.
 */
export async function spawnVillainInChat(sock, chatId) {
  // Don't overwrite an active villain
  if (hasVillain(chatId)) return false;

  // Decide whether to roll a boss
  const isBoss = Math.random() < BOSS_ROLL_CHANCE;

  let charDoc;
  if (isBoss) {
    const all  = await getAllVillains().catch(() => []);
    const bossList = all.filter(v => BOSS_NAMES.has(v.name));
    charDoc = bossList.length
      ? bossList[Math.floor(Math.random() * bossList.length)]
      : await getRandomVillain().catch(() => null);
  } else {
    charDoc = await getRandomVillain().catch(() => null);
  }

  if (!charDoc) return false;

  const level  = villainLevel(5);
  const scaled = scaleStatsToLevel(charDoc, level);

  // Apply boss stat boost
  if (isBoss) {
    scaled.hp      = Math.floor(scaled.hp      * BOSS_STAT_MULT);
    scaled.maxHp   = Math.floor(scaled.maxHp   * BOSS_STAT_MULT);
    scaled.attack  = Math.floor(scaled.attack  * BOSS_STAT_MULT);
    scaled.defense = Math.floor(scaled.defense * BOSS_STAT_MULT);
    scaled.speed   = Math.floor(scaled.speed   * BOSS_STAT_MULT);
  }

  const villain = {
    characterId: charDoc.id,
    name:        charDoc.name,
    displayName: charDoc.name,
    race:        charDoc.race,
    imageUrl:    charDoc.imageUrl,
    forms:       charDoc.forms || [],
    kiFlavorText: charDoc.kiFlavorText || null,
    isBoss,
    level,
    ...scaled,
  };

  const prefix = getPrefix ? getPrefix() : ".";

  setVillain(chatId, villain, (name) => {
    sock.sendMessage(chatId, {
      text: `💨 *${name}* grew bored and *flew away...* No one dared to fight! 💀`,
    }).catch(() => {});
  });

  // Build the arrival caption
  let caption;
  if (isBoss) {
    caption =
`🔥 *A CATASTROPHIC POWER LEVEL IS DETECTED!* 🔥

💀 *${villain.name}* HAS ARRIVED — Level ${level}
${villain.kiFlavorText ? `⚡ Power: ${villain.kiFlavorText}` : ""}

👹 This is no ordinary threat!

Use *${prefix}dbzfight* to engage!
⏰ Flees in 30 minutes.`;
  } else {
    caption =
`⚡ *A menacing power level approaches...* 💀

👹 *${villain.name}* has arrived! — Level ${level}
${villain.kiFlavorText ? `⚡ Power: ${villain.kiFlavorText}` : ""}
🌍 Race: ${villain.race || "Unknown"}

Use *${prefix}dbzfight* to engage!
⏰ Flees in 30 minutes.`;
  }

  // Try canvas arrival scene, fall back to image URL, then text
  let sent = false;
  try {
    const { generateVillainArrivalScene } = await import("./canvas.mjs");
    const buf = await generateVillainArrivalScene({
      villain,
      level,
      kiFlavorText: villain.kiFlavorText,
      fleeTimerMin: 30,
      isBoss,
    });
    await sock.sendMessage(chatId, { image: buf, caption });
    sent = true;
  } catch {}

  if (!sent && villain.imageUrl) {
    try {
      await sock.sendMessage(chatId, { image: { url: villain.imageUrl }, caption });
      sent = true;
    } catch {}
  }

  if (!sent) {
    await sock.sendMessage(chatId, { text: caption }).catch(() => {});
  }

  return true;
}
