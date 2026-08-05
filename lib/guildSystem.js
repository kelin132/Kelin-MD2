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
      description: "",
      icon: null,
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
    if (!guild.members.includes(memberJid)) return false;
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

  async getUserPrimaryGuild(userJid) {
    const c = await col();
    // Prefer owned guild, otherwise first guild they're in
    const owned = await c.findOne({ owner: userJid });
    if (owned) return owned;
    return c.findOne({ members: userJid });
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

  async setDescription(guildName, ownerJid, description) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return null;
    if (guild.owner !== ownerJid) return "not_owner";
    await c.updateOne({ _id: guildName }, { $set: { description } });
    return true;
  },

  async setIcon(guildName, ownerJid, iconUrl) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return null;
    if (guild.owner !== ownerJid) return "not_owner";
    await c.updateOne({ _id: guildName }, { $set: { icon: iconUrl } });
    return true;
  },

  async renameGuild(oldName, ownerJid, newName) {
    const c = await col();
    const guild = await c.findOne({ _id: oldName });
    if (!guild) return null;
    if (guild.owner !== ownerJid) return "not_owner";
    const exists = await c.findOne({ _id: newName });
    if (exists) return "name_taken";
    // Insert new doc, delete old
    const newGuild = { ...guild, _id: newName, name: newName };
    await c.insertOne(newGuild);
    await c.deleteOne({ _id: oldName });
    return newGuild;
  },

  async getRankedGuilds(limit = 10) {
    const c = await col();
    return c.find()
      .sort({ level: -1, treasury: -1, "members": -1 })
      .limit(limit)
      .toArray();
  },

  async isOwner(guildName, userJid) {
    const g = await this.getGuild(guildName);
    return g?.owner === userJid;
  },

  async clearAllGuilds() {
    const c = await col();
    const result = await c.deleteMany({});
    return result.deletedCount;
  },
};
