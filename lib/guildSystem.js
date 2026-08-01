/**
 * KELIN MD — Guild system (MongoDB-backed)
 * All guild plugins import guildSystem from here.
 */
import { getDb } from "./mongo.mjs";

async function col() {
  const db = await getDb();
  return db.collection("guilds");
}

export const guildSystem = {
  async createGuild(name, ownerJid) {
    const c = await col();
    if (await c.findOne({ _id: name })) return null;
    const guild = {
      _id: name,
      name,
      owner: ownerJid,
      members: [ownerJid],
      level: 1,
      treasury: 0,
      createdAt: new Date().toISOString(),
    };
    await c.insertOne(guild);
    return guild;
  },

  async getGuild(name) {
    const c = await col();
    return c.findOne({ _id: name });
  },

  async addMember(guildName, memberJid) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return false;
    if (guild.members.includes(memberJid)) return false;
    await c.updateOne({ _id: guildName }, { $push: { members: memberJid } });
    return true;
  },

  async removeMember(guildName, memberJid) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return false;
    await c.updateOne({ _id: guildName }, { $pull: { members: memberJid } });
    return true;
  },

  async addTreasury(guildName, amount) {
    const c = await col();
    const result = await c.findOneAndUpdate(
      { _id: guildName },
      { $inc: { treasury: amount } },
      { returnDocument: "after" }
    );
    return result?.treasury ?? 0;
  },

  async getAllGuilds() {
    const c = await col();
    return c.find().toArray();
  },

  async getUserGuilds(userJid) {
    const c = await col();
    return c.find({ members: userJid }).toArray();
  },

  async upgradeGuild(guildName, ownerJid) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return null;
    if (guild.owner !== ownerJid) return "not_owner";
    const cost = guild.level * 5000;
    if (guild.treasury < cost) return { need: cost, have: guild.treasury };
    const result = await c.findOneAndUpdate(
      { _id: guildName },
      { $inc: { level: 1, treasury: -cost } },
      { returnDocument: "after" }
    );
    return result;
  },
};
