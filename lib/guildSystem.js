/**
 * KELIN MD — Guild system (MongoDB-backed)
 * All guild plugins import guildSystem from here.
 */
import { getDb } from "./mongo.mjs";

const MAX_GUILD_LEVEL = 20;

function safeLevel(value) {
  return Math.max(1, Math.min(MAX_GUILD_LEVEL, Math.floor(Number(value) || 1)));
}

export function guildTaxRate(level) {
  return Math.min(0.2, 0.05 + (safeLevel(level) - 1) * 0.01);
}

export function guildUpgradeRequirements(level) {
  const currentLevel = safeLevel(level);
  return {
    currentLevel,
    nextLevel: Math.min(MAX_GUILD_LEVEL, currentLevel + 1),
    treasury: currentLevel * 5000,
    guildXp: currentLevel * 1000,
    members: Math.min(12, currentLevel + 1),
    taxRate: guildTaxRate(currentLevel),
    memberCapacity: 8 + currentLevel * 2,
  };
}

function guildTaxMinimum(level) {
  return Math.max(250, safeLevel(level) * 250);
}

function memberName(record, jid) {
  const name = [record?.name, record?.username, record?.pushName, record?.notifyName]
    .find((value) => typeof value === "string" && value.trim());
  if (name) return String(name).trim();
  return String(jid).split("@")[0].split(":")[0];
}

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
      guildXp: 0,
      treasury: 0,
      description: "",
      icon: null,
      taxRate: guildTaxRate(1),
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
    const members = Array.isArray(guild.members) ? guild.members : [];
    if (members.includes(memberJid)) return false;
    const requirements = guildUpgradeRequirements(guild.level);
    if (members.length >= requirements.memberCapacity) return "member_cap";
    await c.updateOne({ _id: guildName }, { $addToSet: { members: memberJid } });
    return true;
  },

  async removeMember(guildName, memberJid) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return false;
    if (!Array.isArray(guild.members) || !guild.members.includes(memberJid)) return false;
    await c.updateOne({ _id: guildName }, { $pull: { members: memberJid } });
    return true;
  },

  async addTreasury(guildName, amount) {
    const contribution = Math.max(0, Math.floor(Number(amount) || 0));
    const c = await col();
    const result = await c.findOneAndUpdate(
      { _id: guildName },
      { $inc: { treasury: contribution, guildXp: Math.max(1, Math.floor(contribution / 25)) } },
      { returnDocument: "after" },
    );
    return result?.treasury ?? 0;
  },

  async recordWorkContribution(guildName, amount, workXp = 0) {
    const contribution = Math.max(0, Math.floor(Number(amount) || 0));
    const earnedXp = Math.max(1, Math.floor(Number(workXp) || 0));
    const c = await col();
    return c.findOneAndUpdate(
      { _id: guildName },
      { $inc: { treasury: contribution, guildXp: earnedXp } },
      { returnDocument: "after" },
    );
  },

  async getGuildTax(memberJid, grossPay = 0) {
    const guild = await this.getUserPrimaryGuild(memberJid);
    if (!guild) return { guild: null, amount: 0, rate: 0, minimum: 0 };
    const level = safeLevel(guild.level);
    const rate = guildTaxRate(level);
    return {
      guild,
      amount: Math.max(0, Math.floor(Math.max(0, Number(grossPay) || 0) * rate)),
      rate,
      minimum: guildTaxMinimum(level),
    };
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
    const owned = await c.findOne({ owner: userJid });
    if (owned) return owned;
    return c.findOne({ members: userJid });
  },

  async getGuildMembers(guildName) {
    const guild = await this.getGuild(guildName);
    if (!guild) return null;
    const members = Array.isArray(guild.members) ? guild.members : [];
    const db = await getDb();
    const users = await db.collection("users").find({ _id: { $in: members } }).toArray();
    const byId = new Map(users.map((user) => [String(user._id), user]));
    return members.map((jid) => ({
      jid,
      name: memberName(byId.get(String(jid)), jid),
      isOwner: String(jid) === String(guild.owner),
    }));
  },

  async upgradeGuild(guildName, ownerJid) {
    const c = await col();
    const guild = await c.findOne({ _id: guildName });
    if (!guild) return null;
    if (guild.owner !== ownerJid) return "not_owner";
    const level = safeLevel(guild.level);
    if (level >= MAX_GUILD_LEVEL) return { reason: "max_level", level, maxLevel: MAX_GUILD_LEVEL };
    const requirements = guildUpgradeRequirements(level);
    const members = Array.isArray(guild.members) ? guild.members : [];
    const guildXp = Number(guild.guildXp) || 0;
    const treasury = Number(guild.treasury) || 0;
    if (treasury < requirements.treasury || guildXp < requirements.guildXp || members.length < requirements.members) {
      return {
        reason: "requirements",
        level,
        treasury,
        guildXp,
        members: members.length,
        requirements,
      };
    }
    const result = await c.findOneAndUpdate(
      {
        _id: guildName,
        owner: ownerJid,
        level,
        treasury: { $gte: requirements.treasury },
        guildXp: { $gte: requirements.guildXp },
      },
      {
        $inc: { level: 1, treasury: -requirements.treasury },
        $set: { taxRate: guildTaxRate(level + 1) },
      },
      { returnDocument: "after" },
    );
    return result ?? { reason: "requirements", level, treasury, guildXp, members: members.length, requirements };
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
    const newGuild = { ...guild, _id: newName, name: newName };
    await c.insertOne(newGuild);
    await c.deleteOne({ _id: oldName });
    return newGuild;
  },

  async getRankedGuilds(limit = 10) {
    const c = await col();
    return c.find()
      .sort({ level: -1, guildXp: -1, treasury: -1, members: -1 })
      .limit(limit)
      .toArray();
  },

  isOwner(guildName, userJid) {
    return this.getGuild(guildName).then((guild) => guild?.owner === userJid);
  },

  async clearAllGuilds() {
    const c = await col();
    const result = await c.deleteMany({});
    return result.deletedCount;
  },
};
