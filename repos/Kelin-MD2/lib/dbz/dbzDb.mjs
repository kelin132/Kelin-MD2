/**
 * KELIN MD — DBZ fighter storage (MongoDB)
 * Collection: dbz_fighters
 * Parallel to lib/pokemon/pokemonDb.mjs + players.mjs
 */
import { getDb } from "../mongo.mjs";
import { getXpNeeded, scaleStatsToLevel, MAX_BATTLE_KI } from "./gameLogic.mjs";

function col() { return getDb().collection("dbz_fighters"); }

/** Build a fighter document from a cached DBZ character + owner + level. */
export function buildFighter(charDoc, ownerJid, level = 5) {
  const scaled = scaleStatsToLevel(charDoc, level);
  return {
    ownerJid,
    characterId:   charDoc.id,
    name:          charDoc.name,
    race:          charDoc.race || "Unknown",
    imageUrl:      charDoc.imageUrl,
    forms:         charDoc.forms || [],
    currentFormIndex: 0,
    level,
    xp:            0,
    xpNeeded:      getXpNeeded(level),
    hp:            scaled.hp,
    maxHp:         scaled.maxHp,
    attack:        scaled.attack,
    defense:       scaled.defense,
    speed:         scaled.speed,
    ki:            MAX_BATTLE_KI,
    maxKi:         MAX_BATTLE_KI,
    wins:          0,
    losses:        0,
    selectedAt:    new Date(),
  };
}

/** Save or update a fighter for a player (one active fighter per player). */
export async function saveFighter(fighter) {
  await col().updateOne(
    { ownerJid: fighter.ownerJid },
    { $set: fighter },
    { upsert: true }
  );
  return fighter;
}

/** Convert profiles created by the original .dbzstart wizard to the active
 * fighter shape used by battles. The wizard predates dbz_fighters and stores
 * profiles in dbz_players, so keep old profiles playable without re-selection.
 */
function legacyPlayerToFighter(player) {
  return {
    ownerJid:       player.jid,
    characterId:    String(player.character || "").toLowerCase().replace(/\s+/g, "-"),
    name:           player.character || "Unknown Fighter",
    race:           player.race || "Unknown",
    imageUrl:       player.characterImageUrl || null,
    forms:          player.forms || [],
    currentFormIndex: 0,
    level:          player.level || 1,
    xp:             player.xp || 0,
    xpNeeded:       player.xpNeeded || getXpNeeded(player.level || 1),
    hp:             player.hp ?? player.maxHp ?? 0,
    maxHp:          player.maxHp ?? player.hp ?? 0,
    attack:         player.attack || 0,
    defense:        player.defense || 0,
    speed:          player.speed || 0,
    ki:             player.ki ?? player.maxKi ?? MAX_BATTLE_KI,
    maxKi:          player.maxKi ?? MAX_BATTLE_KI,
    wins:           player.wins || 0,
    losses:         player.losses || 0,
    selectedAt:     player.createdAt ? new Date(player.createdAt) : new Date(),
  };
}

/** Get the active fighter for a player. */
export async function getFighter(ownerJid) {
  const fighters = col();
  const active = await fighters.findOne({ ownerJid });
  if (active) return active;

  // Backward compatibility for profiles created by .dbzstart/.dbzselect.
  const legacy = await getDb().collection("dbz_players").findOne({ jid: ownerJid });
  if (!legacy) return null;

  const migrated = legacyPlayerToFighter(legacy);
  await fighters.updateOne({ ownerJid }, { $set: migrated }, { upsert: true });
  return fighters.findOne({ ownerJid });
}

/** Update fighter fields. */
export async function updateFighter(ownerJid, updates) {
  await col().updateOne({ ownerJid }, { $set: updates });
}

/** Restore fighter to full HP (and reset Ki). */
export async function healFighter(ownerJid) {
  const fighter = await getFighter(ownerJid);
  if (!fighter) return null;
  await col().updateOne(
    { ownerJid },
    { $set: { hp: fighter.maxHp, ki: MAX_BATTLE_KI } }
  );
  return { ...fighter, hp: fighter.maxHp, ki: MAX_BATTLE_KI };
}

/** Add XP to a fighter; level up if threshold reached. */
export async function addFighterXP(ownerJid, amount) {
  const fighter = await getFighter(ownerJid);
  if (!fighter) return null;

  let xp      = Math.max(0, (fighter.xp || 0) + Math.max(0, Number(amount) || 0));
  let level   = Math.max(1, fighter.level || 1);
  let leveledUp = false;

  while (level < 100) {
    const needed = getXpNeeded(level);
    if (xp < needed) break;
    xp -= needed;
    level++;
    leveledUp = true;
  }

  const xpNeeded = getXpNeeded(level);
  const updates  = { xp, xpNeeded, level };

  if (leveledUp) {
    // Rescale stats to new level preserving HP ratio
    const hpRatio  = fighter.maxHp > 0 ? fighter.hp / fighter.maxHp : 1;
    const newMaxHp = Math.max(10, Math.floor((fighter.maxHp / (1 + fighter.level * 0.05)) * (1 + level * 0.05)));
    updates.maxHp   = newMaxHp;
    updates.hp      = Math.min(fighter.hp, newMaxHp);
    updates.attack  = Math.max(5, Math.floor((fighter.attack  / (1 + fighter.level * 0.05)) * (1 + level * 0.05)));
    updates.defense = Math.max(5, Math.floor((fighter.defense / (1 + fighter.level * 0.05)) * (1 + level * 0.05)));
    updates.speed   = Math.max(5, Math.floor((fighter.speed   / (1 + fighter.level * 0.05)) * (1 + level * 0.05)));
  }

  await col().updateOne({ ownerJid }, { $set: updates });
  return { leveledUp, newLevel: level, fighter: { ...fighter, ...updates } };
}

/** Record a win or loss. */
export async function recordResult(ownerJid, result) {
  const inc = result === "win" ? { wins: 1 } : { losses: 1 };
  await col().updateOne({ ownerJid }, { $inc: inc });
}
