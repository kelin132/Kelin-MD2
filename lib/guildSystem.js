/**
 * KELIN MD — Guild system (MongoDB-backed)
 * All guild plugins import guildSystem from here.
 */
import { getDb } from "./mongo.mjs";
import { randomUUID } from "node:crypto";
import { resolveAccountIdentity } from "./accountIdentity.mjs";

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

function whatsappIdentityVariants(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  if (raw.startsWith("discord:")) return [raw];
  const withoutDevice = raw.replace(/:\d+(?=@)/, "");
  if (!/^\+?\d+$/.test(raw) && !/@(?:s\.whatsapp\.net|c\.us|lid)$/i.test(withoutDevice)) {
    return [...new Set([raw, withoutDevice])];
  }
  const [local = withoutDevice, domain = "s.whatsapp.net"] = withoutDevice.split("@");
  const normalizedDomain = domain.toLowerCase() === "c.us" ? "s.whatsapp.net" : domain;
  const digits = local.replace(/\D/g, "");
  const isLid = normalizedDomain.toLowerCase() === "lid";
  return [...new Set([
    raw,
    withoutDevice,
    local,
    `${local}@${normalizedDomain}`,
    ...(digits && isLid ? [`${digits}@lid`] : []),
    ...(digits && !isLid
      ? [digits, `+${digits}`, `${digits}@s.whatsapp.net`, `${digits}@c.us`, `${digits}:0@s.whatsapp.net`, `${digits}:0@c.us`]
      : []),
  ])];
}

async function identityAliases(value) {
  const db = await getDb();
  const aliases = whatsappIdentityVariants(String(value ?? ""));
  const resolved = await resolveAccountIdentity(db, String(value ?? ""));
  return [...new Set([...aliases, ...(resolved.ids || [])])];
}

async function sameIdentity(left, right) {
  const [leftAliases, rightAliases] = await Promise.all([
    identityAliases(left),
    identityAliases(right),
  ]);
  return leftAliases.some((alias) => rightAliases.includes(alias));
}

export const guildSystem = {
  async createGuild(name, ownerJid) {
    const c = await col();
    if (await c.findOne({ $or: [{ _id: name }, { name }] })) return null;
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
    const value = String(name ?? "").trim();
    return c.findOne({ $or: [{ _id: value }, { name: value }] });
  },

  async requestMembership(guildName, applicantId, applicantName = "") {
    const db = await getDb();
    const guilds = db.collection("guilds");
    const guild = await this.getGuild(guildName);
    if (!guild) return { ok: false, reason: "guild_missing" };
    const aliases = await identityAliases(applicantId);
    if ((guild.members || []).some((member) => whatsappIdentityVariants(String(member)).some((id) => aliases.includes(id)))) {
      return { ok: false, reason: "already_member" };
    }
    const currentGuild = await guilds.findOne({ members: { $in: aliases } });
    if (currentGuild) return { ok: false, reason: "already_in_guild", guildName: currentGuild.name };
    const capacity = guildUpgradeRequirements(guild.level).memberCapacity;
    if ((guild.members || []).length >= capacity) return { ok: false, reason: "member_cap", capacity };

    const applications = db.collection("guild_applications");
    const pending = await applications.findOne({
      guildId: String(guild._id),
      status: "pending",
      applicantAliases: { $in: aliases },
    });
    if (pending) return { ok: true, alreadyPending: true, code: pending.code };

    const id = randomUUID();
    await applications.insertOne({
      _id: id,
      code: id.replaceAll("-", "").slice(0, 10).toUpperCase(),
      guildId: String(guild._id),
      applicantId: String(applicantId),
      applicantAliases: aliases,
      applicantName: String(applicantName || String(applicantId).split("@")[0]),
      status: "pending",
      createdAt: new Date(),
    });
    return { ok: true, alreadyPending: false, code: id.replaceAll("-", "").slice(0, 10).toUpperCase() };
  },

  async getPendingApplications(guildName, ownerId) {
    const guild = await this.getGuild(guildName);
    if (!guild) return { ok: false, reason: "guild_missing" };
    const ownerAliases = await identityAliases(ownerId);
    if (!(await identityAliases(guild.owner)).some((id) => ownerAliases.includes(id))) {
      return { ok: false, reason: "not_owner" };
    }
    const db = await getDb();
    const applications = await db.collection("guild_applications")
      .find({ guildId: String(guild._id), status: "pending" })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();
    return { ok: true, applications };
  },

  async reviewApplication(code, ownerId, action) {
    const db = await getDb();
    const applications = db.collection("guild_applications");
    const application = await applications.findOne({
      $or: [{ code: String(code).toUpperCase() }, { _id: String(code) }],
      status: "pending",
    });
    if (!application) return { ok: false, reason: "application_missing" };
    const guilds = db.collection("guilds");
    const guild = await guilds.findOne({ _id: application.guildId });
    if (!guild) return { ok: false, reason: "guild_missing" };
    const ownerAliases = await identityAliases(ownerId);
    if (!(await identityAliases(guild.owner)).some((id) => ownerAliases.includes(id))) {
      return { ok: false, reason: "not_owner" };
    }

    if (action === "approve") {
      const aliases = [...new Set([
        ...whatsappIdentityVariants(String(application.applicantId)),
        ...(application.applicantAliases || []).flatMap(whatsappIdentityVariants),
        ...(await identityAliases(application.applicantId)),
      ])];
      const existing = await guilds.findOne({ members: { $in: aliases } });
      if (existing && String(existing._id) !== String(guild._id)) {
        return { ok: false, reason: "already_in_guild", guildName: existing.name };
      }
      const members = Array.isArray(guild.members) ? guild.members : [];
      const capacity = guildUpgradeRequirements(guild.level).memberCapacity;
      const alreadyMember = members.some((member) =>
        whatsappIdentityVariants(String(member)).some((id) => aliases.includes(id)),
      );
      if (!alreadyMember) {
        const added = await guilds.updateOne(
          {
            _id: guild._id,
            $expr: { $lt: [{ $size: { $ifNull: ["$members", []] } }, capacity] },
          },
          { $addToSet: { members: application.applicantId } },
        );
        if (added.modifiedCount !== 1) return { ok: false, reason: "member_cap", capacity };
      }
    }

    const status = action === "approve" ? "approved" : "rejected";
    const result = await applications.updateOne(
      { _id: application._id, status: "pending" },
      { $set: { status, reviewedAt: new Date(), reviewedBy: String(ownerId) } },
    );
    return result.modifiedCount === 1 ? { ok: true, status } : { ok: false, reason: "already_reviewed" };
  },

  async addMember(guildName, memberJid) {
    const c = await col();
    const guild = await this.getGuild(guildName);
    if (!guild) return false;
    const members = Array.isArray(guild.members) ? guild.members : [];
    const aliases = await identityAliases(memberJid);
    if (members.some((member) => whatsappIdentityVariants(String(member)).some((id) => aliases.includes(id)))) return false;
    const requirements = guildUpgradeRequirements(guild.level);
    if (members.length >= requirements.memberCapacity) return "member_cap";
    await c.updateOne({ _id: guild._id }, { $addToSet: { members: memberJid } });
    return true;
  },

  async removeMember(guildName, memberJid) {
    const c = await col();
    const guild = await this.getGuild(guildName);
    if (!guild) return false;
    const aliases = await identityAliases(memberJid);
    if (!Array.isArray(guild.members) || !guild.members.some((member) => whatsappIdentityVariants(String(member)).some((id) => aliases.includes(id)))) return false;
    await c.updateOne({ _id: guild._id }, { $pull: { members: { $in: aliases } } });
    return true;
  },

  async addTreasury(guildName, amount) {
    const contribution = Math.max(0, Math.floor(Number(amount) || 0));
    const c = await col();
    const guild = await this.getGuild(guildName);
    if (!guild) return 0;
    const result = await c.findOneAndUpdate(
      { _id: guild._id },
      { $inc: { treasury: contribution, guildXp: Math.max(1, Math.floor(contribution / 25)) } },
      { returnDocument: "after" },
    );
    return result?.treasury ?? 0;
  },

  async recordWorkContribution(guildName, amount, workXp = 0) {
    const contribution = Math.max(0, Math.floor(Number(amount) || 0));
    const earnedXp = Math.max(1, Math.floor(Number(workXp) || 0));
    const c = await col();
    const guild = await this.getGuild(guildName);
    if (!guild) return null;
    return c.findOneAndUpdate(
      { _id: guild._id },
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
    const aliases = await identityAliases(userJid);
    return c.find({ members: { $in: aliases } }).toArray();
  },

  async getUserPrimaryGuild(userJid) {
    const c = await col();
    const aliases = await identityAliases(userJid);
    const owned = await c.findOne({ owner: { $in: aliases } });
    if (owned) return owned;
    return c.findOne({ members: { $in: aliases } });
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
    const guild = await this.getGuild(guildName);
    if (!guild) return null;
    if (!(await sameIdentity(guild.owner, ownerJid))) return "not_owner";
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
        _id: guild._id,
        owner: guild.owner,
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
    const guild = await this.getGuild(guildName);
    if (!guild) return null;
    if (!(await sameIdentity(guild.owner, ownerJid))) return "not_owner";
    await c.updateOne({ _id: guild._id }, { $set: { description } });
    return true;
  },

  async setIcon(guildName, ownerJid, iconUrl) {
    const c = await col();
    const guild = await this.getGuild(guildName);
    if (!guild) return null;
    if (!(await sameIdentity(guild.owner, ownerJid))) return "not_owner";
    await c.updateOne({ _id: guild._id }, { $set: { icon: iconUrl } });
    return true;
  },

  async renameGuild(oldName, ownerJid, newName) {
    const c = await col();
    const guild = await this.getGuild(oldName);
    if (!guild) return null;
    if (!(await sameIdentity(guild.owner, ownerJid))) return "not_owner";
    const exists = await this.getGuild(newName);
    if (exists) return "name_taken";
    await c.updateOne({ _id: guild._id }, { $set: { name: newName } });
    return { ...guild, name: newName };
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
