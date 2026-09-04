/**
 * KELIN MD — Naruto player database (MongoDB-backed, raw driver)
 * Replaces the Mongoose-based original so no schema file is needed.
 */
import { getDb } from "../mongo.mjs";
import RANKS from "../ranks.js";

async function col() {
  const db = await getDb();
  return db.collection("naruto_players");
}

/** Attach a .save() method to a raw document */
function attachSave(doc) {
  doc.save = async () => {
    const c = await col();
    const { _id, save, ...data } = doc;
    await c.updateOne({ jid: data.jid }, { $set: data });
  };
  return doc;
}

/**
 * Return the rank name a player should hold at the given level.
 * Ranks are sorted ascending by level; we walk backwards to find the highest
 * threshold the player has met.
 */
export function getRankForLevel(level) {
  const sorted = [...RANKS].sort((a, b) => b.level - a.level);
  for (const rank of sorted) {
    if (level >= rank.level) return rank.name;
  }
  return RANKS[0].name; // fallback: lowest rank
}

const DEFAULT_PLAYER = (jid) => ({
  jid,
  username:   jid.split("@")[0],
  level:      1,
  xp:         0,
  xpNeeded:   100,
  hp:         100,
  maxHp:      100,
  chakra:     100,
  maxChakra:  100,
  attack:     10,
  defense:    10,
  speed:      10,
  ryo:        0,
  jutsu:      [],
  inventory:  [],
  village:    null,
  clan:       null,
  rank:       "Academy Student",
  createdAt:  new Date().toISOString(),
});

class Players {
  async get(jid) {
    const c   = await col();
    const doc = await c.findOne({ jid });
    if (!doc) return null;
    return attachSave(doc);
  }

  async create(data) {
    const c    = await col();
    const doc  = { ...DEFAULT_PLAYER(data.jid || ""), ...data };
    const res  = await c.insertOne(doc);
    doc._id    = res.insertedId;
    return attachSave(doc);
  }

  async exists(jid) {
    const c = await col();
    return !!(await c.findOne({ jid }, { projection: { jid: 1 } }));
  }

  /** update is a MongoDB update operator object e.g. { $inc: { ryo: 100 } } */
  async update(jid, update) {
    const c   = await col();
    await c.updateOne({ jid }, update);
    const doc = await c.findOne({ jid });
    return doc ? attachSave(doc) : null;
  }

  async delete(jid) {
    const c = await col();
    return c.deleteOne({ jid });
  }

  /**
   * Add XP, handle level-ups, and promote rank automatically.
   *
   * Returns:
   *   { player, leveledUp: boolean, levelsGained: number,
   *     rankedUp: boolean, newRank: string | null }
   */
  async addXP(jid, amount) {
    const player = await this.get(jid);
    if (!player) return null;

    const oldLevel = player.level;
    const oldRank  = player.rank;

    player.xp = Math.max(0, player.xp + amount);

    // Guard: ensure xpNeeded is a valid number (prevents permanent level-lock)
    if (!player.xpNeeded || player.xpNeeded < 1) player.xpNeeded = 100;
    if (!player.level    || player.level    < 1) player.level    = 1;

    while (player.xp >= player.xpNeeded) {
      player.xp      -= player.xpNeeded;
      player.level++;
      player.xpNeeded = Math.floor(player.xpNeeded * 1.25);

      // Base stat boosts per level
      player.maxHp     += 20;
      player.maxChakra += 15;
      player.attack    += 3;
      player.defense   += 2;
      player.speed     += 2;

      player.hp     = player.maxHp;
      player.chakra = player.maxChakra;
    }

    // ── Rank promotion ────────────────────────────────────────────────────────
    const correctRank = getRankForLevel(player.level);
    player.rank = correctRank;

    await player.save();

    const leveledUp  = player.level > oldLevel;
    const rankedUp   = correctRank !== oldRank;

    return {
      player,
      leveledUp,
      levelsGained: player.level - oldLevel,
      rankedUp,
      newRank: rankedUp ? correctRank : null,
      oldRank,
    };
  }

  async addRyo(jid, amount) {
    return this.update(jid, { $inc: { ryo: amount } });
  }

  async heal(jid) {
    const player = await this.get(jid);
    if (!player) return null;
    player.hp     = player.maxHp;
    player.chakra = player.maxChakra;
    await player.save();
    return player;
  }

  async addItem(jid, item) {
    return this.update(jid, { $push: { inventory: item } });
  }

  async learnJutsu(jid, jutsu) {
    return this.update(jid, { $addToSet: { jutsu } });
  }

  async getAll() {
    const c    = await col();
    const docs = await c.find().toArray();
    return docs.map(attachSave);
  }
}

export default new Players();
