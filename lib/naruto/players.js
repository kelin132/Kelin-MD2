/**
 * KELIN MD — Naruto player database (MongoDB-backed, raw driver)
 * Replaces the Mongoose-based original so no schema file is needed.
 */
import { getDb } from "../mongo.mjs";

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

  async addXP(jid, amount) {
    const player = await this.get(jid);
    if (!player) return null;

    player.xp += amount;

    while (player.xp >= player.xpNeeded) {
      player.xp      -= player.xpNeeded;
      player.level++;
      player.xpNeeded = Math.floor(player.xpNeeded * 1.25);

      player.maxHp     += 20;
      player.maxChakra += 15;
      player.attack    += 3;
      player.defense   += 2;
      player.speed     += 2;

      player.hp     = player.maxHp;
      player.chakra = player.maxChakra;
    }

    await player.save();
    return player;
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
