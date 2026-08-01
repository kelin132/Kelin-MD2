/**
 * KELIN MD — Dragon Ball Z player data manager
 * MongoDB-backed player profiles for the DBZ system.
 * Collection: dbz_players
 */

import { getDb } from "../mongo.mjs";
import { xpNeeded } from "./utils.js";

const COL = "dbz_players";

async function col() {
  return getDb().collection(COL);
}

function attachSave(doc) {
  doc.save = async function () {
    const { _id, save: _s, ...data } = this;
    await (await col()).updateOne({ _id }, { $set: data }, { upsert: true });
  };
  return doc;
}

class Players {
  /**
   * Get a player by JID, returns null if not found.
   */
  async get(jid) {
    const c = await col();
    const doc = await c.findOne({ jid });
    return doc ? attachSave(doc) : null;
  }

  /**
   * Create a brand-new player profile.
   */
  async create(jid, username, race, character, baseStats) {
    const c = await col();
    const doc = {
      jid,
      username,
      race,
      character,           // chosen character skin (e.g. "Goku")
      characterImageUrl: null,

      level: 1,
      xp: 0,
      xpNeeded: xpNeeded(1),

      hp: baseStats.hp,
      maxHp: baseStats.hp,
      ki: baseStats.ki,
      maxKi: baseStats.ki,
      attack: baseStats.attack,
      defense: baseStats.defense,
      speed: baseStats.speed,

      techniques: [],      // learned technique IDs
      inventory: [],

      zeni: 500,           // starting Zeni (replacing Ryo)
      wins: 0,
      losses: 0,
      missionsCompleted: 0,
      transformationsUnlocked: [],
      createdAt: Date.now(),
    };

    await c.insertOne(doc);
    return attachSave(await c.findOne({ jid }));
  }

  async update(jid, ops) {
    const c = await col();
    await c.updateOne({ jid }, ops, { upsert: false });
    return this.get(jid);
  }

  /**
   * Add XP and handle level-ups. Returns updated player.
   */
  async addXp(jid, amount) {
    const player = await this.get(jid);
    if (!player) return null;

    player.xp += amount;

    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++;
      player.xpNeeded = xpNeeded(player.level);

      // Stats grow on level-up
      player.maxHp      += 18;
      player.maxKi      += 14;
      player.attack     += 3;
      player.defense    += 2;
      player.speed      += 2;

      // Restore on level-up
      player.hp  = player.maxHp;
      player.ki  = player.maxKi;
    }

    await player.save();
    return player;
  }

  async addZeni(jid, amount) {
    return this.update(jid, { $inc: { zeni: amount } });
  }

  async heal(jid) {
    const player = await this.get(jid);
    if (!player) return null;
    player.hp = player.maxHp;
    player.ki = player.maxKi;
    await player.save();
    return player;
  }

  async learnTechnique(jid, techniqueId) {
    return this.update(jid, { $addToSet: { techniques: techniqueId } });
  }

  async addItem(jid, item) {
    return this.update(jid, { $push: { inventory: item } });
  }

  async getAll() {
    const c = await col();
    const docs = await c.find().toArray();
    return docs.map(attachSave);
  }

  async getLeaderboard(limit = 10) {
    const c = await col();
    return c
      .find()
      .sort({ level: -1, xp: -1 })
      .limit(limit)
      .toArray();
  }
}

export default new Players();
