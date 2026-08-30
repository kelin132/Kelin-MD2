// Naruto player manager backed by the same native Mongo connection as the
// rest of KELIN MD. The archive referenced a Mongoose model that is not part
// of this project, so this keeps the old API without introducing a second DB
// library or a missing model import.
import { getDb } from "./mongo.mjs";
import { xpNeeded } from "./utils.js";

const COLLECTION = "naruto_players";

async function collection() {
  return getDb().collection(COLLECTION);
}

function attachSave(doc) {
  if (!doc) return null;
  doc.save = async function save() {
    const { _id, save: _save, ...data } = this;
    await (await collection()).updateOne({ _id }, { $set: data }, { upsert: true });
  };
  return doc;
}

class Players {
  async get(jid) {
    return attachSave(await (await collection()).findOne({ jid }));
  }

  async create(data) {
    const now = Date.now();
    const player = {
      jid: data.jid,
      username: data.username || "Shinobi",
      clan: data.clan,
      village: data.village,
      level: 1,
      xp: 0,
      xpNeeded: xpNeeded(1),
      hp: data.hp,
      maxHp: data.maxHp,
      chakra: data.chakra,
      maxChakra: data.maxChakra,
      attack: data.attack,
      defense: data.defense,
      speed: data.speed,
      jutsu: data.jutsu || ["basic_taijutsu"],
      inventory: data.inventory || [],
      ryo: data.ryo ?? 500,
      wins: 0,
      losses: 0,
      missionsCompleted: 0,
      createdAt: now,
      updatedAt: now,
    };
    const c = await collection();
    await c.insertOne(player);
    return attachSave(player);
  }

  async exists(jid) {
    return Boolean(await this.get(jid));
  }

  async update(jid, update) {
    const c = await collection();
    await c.updateOne({ jid }, update);
    return this.get(jid);
  }

  async delete(jid) {
    return (await collection()).deleteOne({ jid });
  }

  async addXp(jid, amount) {
    const player = await this.get(jid);
    if (!player) return null;

    player.xp = (player.xp || 0) + Math.max(0, Number(amount) || 0);
    player.xpNeeded = player.xpNeeded || xpNeeded(player.level || 1);
    let levelledUp = 0;

    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level = (player.level || 1) + 1;
      player.xpNeeded = xpNeeded(player.level);
      player.maxHp += 20;
      player.maxChakra += 15;
      player.attack += 3;
      player.defense += 2;
      player.speed += 2;
      player.hp = player.maxHp;
      player.chakra = player.maxChakra;
      levelledUp++;
    }

    player.updatedAt = Date.now();
    await player.save();
    return { player, levelledUp };
  }

  async addXP(jid, amount) {
    return this.addXp(jid, amount);
  }

  async addRyo(jid, amount) {
    return this.update(jid, {
      $inc: { ryo: Number(amount) || 0 },
      $set: { updatedAt: Date.now() },
    });
  }

  async heal(jid) {
    const player = await this.get(jid);
    if (!player) return null;
    player.hp = player.maxHp;
    player.chakra = player.maxChakra;
    player.updatedAt = Date.now();
    await player.save();
    return player;
  }

  async addItem(jid, itemId) {
    return this.update(jid, {
      $push: { inventory: itemId },
      $set: { updatedAt: Date.now() },
    });
  }

  async learnJutsu(jid, jutsuId) {
    return this.update(jid, {
      $addToSet: { jutsu: jutsuId },
      $set: { updatedAt: Date.now() },
    });
  }

  async getLeaderboard(limit = 10) {
    return (await collection())
      .find({})
      .sort({ level: -1, xp: -1 })
      .limit(limit)
      .toArray();
  }
}

export default new Players();