import { getDb } from "./mongo.mjs";
import { guildSystem } from "./guildSystem.js";
import { GUILD_WAR_DURATION_MS, pairWarMembers } from "./guildWarRules.mjs";

const ACTIVE_WAR_STATUSES = ["pending", "active"];
const FINISHED_WAR_STATUSES = ["completed", "expired"];
let indexPromise;

async function warsCollection() {
  const db = await getDb();
  const collection = db.collection("guildWars");
  indexPromise ??= collection.createIndex(
    { guildNames: 1 },
    {
      name: "guildWars_one_active_per_guild",
      unique: true,
      partialFilterExpression: { status: { $in: ACTIVE_WAR_STATUSES } },
    },
  );
  await indexPromise;
  return collection;
}

function isOwner(guild, userJid) {
  return String(guild?.owner) === String(userJid);
}

async function expireIfNeeded(collection, war, now = new Date()) {
  if (!war || !ACTIVE_WAR_STATUSES.includes(war.status)) return war;
  const deadline = new Date(
    war.status === "pending" ? war.challengeExpiresAt : war.deadlineAt,
  ).getTime();
  if (!Number.isFinite(deadline) || deadline > now.getTime()) return war;

  await collection.updateOne(
    { _id: war._id, status: war.status },
    {
      $set: {
        status: "expired",
        finishedAt: now,
        finishReason: "deadline",
      },
    },
  );
  return (await collection.findOne({ _id: war._id })) || {
    ...war,
    status: "expired",
    finishedAt: now,
    finishReason: "deadline",
  };
}

async function ongoingWarForGuild(collection, guildName, now = new Date()) {
  const war = await collection.findOne({
    guildNames: guildName,
    status: { $in: ACTIVE_WAR_STATUSES },
  });
  return expireIfNeeded(collection, war, now);
}

export const guildWarSystem = {
  async challenge({ ownerJid, challengerName, opponentName, channelId }) {
    const db = await getDb();
    const guilds = db.collection("guilds");
    const [guildA, guildB] = await Promise.all([
      guilds.findOne({ _id: challengerName }),
      guilds.findOne({ _id: opponentName }),
    ]);
    if (!guildA) return { ok: false, reason: "challenger_missing" };
    if (!guildB) return { ok: false, reason: "opponent_missing" };
    if (String(guildA._id) === String(guildB._id)) {
      return { ok: false, reason: "same_guild" };
    }
    if (!isOwner(guildA, ownerJid)) return { ok: false, reason: "not_owner" };

    const collection = await warsCollection();
    const now = new Date();
    for (const name of [guildA.name, guildB.name]) {
      const existing = await ongoingWarForGuild(collection, name, now);
      if (existing && ACTIVE_WAR_STATUSES.includes(existing.status)) {
        return { ok: false, reason: "guild_busy", war: existing };
      }
    }

    const war = {
      guildNames: [guildA.name, guildB.name],
      guildA: { name: guildA.name, owner: guildA.owner },
      guildB: { name: guildB.name, owner: guildB.owner },
      status: "pending",
      createdBy: ownerJid,
      channelId: channelId || null,
      createdAt: now,
      challengeExpiresAt: new Date(now.getTime() + GUILD_WAR_DURATION_MS),
      deadlineAt: null,
      matchups: [],
    };

    try {
      const result = await collection.insertOne(war);
      return { ok: true, war: { ...war, _id: result.insertedId } };
    } catch (error) {
      if (error?.code === 11000) return { ok: false, reason: "guild_busy" };
      throw error;
    }
  },

  async accept({ ownerJid, guildName }) {
    const collection = await warsCollection();
    let war = await collection.findOne({ guildNames: guildName, status: "pending" });
    if (!war) return { ok: false, reason: "no_challenge" };
    war = await expireIfNeeded(collection, war);
    if (war.status !== "pending") return { ok: false, reason: "challenge_expired", war };
    if (war.guildB.name !== guildName || !isOwner(war.guildB, ownerJid)) {
      return { ok: false, reason: "not_opponent_owner" };
    }

    const [guildA, guildB] = await Promise.all([
      guildSystem.getGuild(war.guildA.name),
      guildSystem.getGuild(war.guildB.name),
    ]);
    if (!guildA || !guildB) return { ok: false, reason: "guild_missing" };
    const [membersA, membersB] = await Promise.all([
      guildSystem.getGuildMembers(war.guildA.name),
      guildSystem.getGuildMembers(war.guildB.name),
    ]);
    const matchups = pairWarMembers(membersA, membersB);
    if (!matchups.length) return { ok: false, reason: "no_members" };

    const now = new Date();
    const deadlineAt = new Date(now.getTime() + GUILD_WAR_DURATION_MS);
    const result = await collection.updateOne(
      {
        _id: war._id,
        status: "pending",
        challengeExpiresAt: { $gt: now },
      },
      {
        $set: {
          status: "active",
          acceptedBy: ownerJid,
          acceptedAt: now,
          deadlineAt,
          matchups,
        },
      },
    );
    if (result.modifiedCount !== 1) {
      return { ok: false, reason: "challenge_expired" };
    }
    return { ok: true, war: await collection.findOne({ _id: war._id }) };
  },

  async status(guildName) {
    const collection = await warsCollection();
    const ongoing = await ongoingWarForGuild(collection, guildName);
    if (ongoing) return ongoing;
    return collection.findOne(
      {
        guildNames: guildName,
        status: { $in: FINISHED_WAR_STATUSES },
      },
      { sort: { createdAt: -1 } },
    );
  },

  async cancel({ ownerJid, guildName }) {
    const collection = await warsCollection();
    let war = await collection.findOne({ guildNames: guildName, status: "pending" });
    if (!war) return { ok: false, reason: "no_challenge" };
    war = await expireIfNeeded(collection, war);
    if (war.status !== "pending") return { ok: false, reason: "challenge_expired", war };
    if (war.guildA.name !== guildName || !isOwner(war.guildA, ownerJid)) {
      return { ok: false, reason: "not_challenger_owner" };
    }

    const now = new Date();
    const result = await collection.updateOne(
      { _id: war._id, status: "pending" },
      { $set: { status: "cancelled", finishedAt: now, finishReason: "cancelled_by_challenger" } },
    );
    if (result.modifiedCount !== 1) return { ok: false, reason: "challenge_expired" };
    return { ok: true, war: await collection.findOne({ _id: war._id }) };
  },

  async report({ ownerJid, guildName, matchupNumber, resultType, side }) {
    const collection = await warsCollection();
    let war = await collection.findOne({ guildNames: guildName, status: "active" });
    if (!war) return { ok: false, reason: "no_active_war" };
    war = await expireIfNeeded(collection, war);
    if (war.status !== "active") return { ok: false, reason: "war_expired", war };
    if (!isOwner(war.guildA, ownerJid) && !isOwner(war.guildB, ownerJid)) {
      return { ok: false, reason: "not_owner" };
    }
    if (!["win", "forfeit"].includes(resultType) || !["a", "b"].includes(side)) {
      return { ok: false, reason: "invalid_result" };
    }

    const index = Number(matchupNumber) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= war.matchups.length) {
      return { ok: false, reason: "invalid_matchup" };
    }

    const winnerSide = resultType === "win"
      ? side
      : side === "a" ? "b" : "a";
    const status = resultType === "win" ? "Completed" : "Forfeited";
    const now = new Date();
    const result = await collection.updateOne(
      {
        _id: war._id,
        status: "active",
        [`matchups.${index}.status`]: "Pending",
      },
      {
        $set: {
          [`matchups.${index}.status`]: status,
          [`matchups.${index}.winnerSide`]: winnerSide,
          [`matchups.${index}.resultType`]: resultType,
          [`matchups.${index}.reportedBy`]: ownerJid,
          [`matchups.${index}.resolvedAt`]: now,
        },
      },
    );
    if (result.modifiedCount !== 1) {
      return { ok: false, reason: "matchup_resolved", war: await collection.findOne({ _id: war._id }) };
    }

    war = await collection.findOne({ _id: war._id });
    if (war.matchups.every((matchup) => matchup.status !== "Pending")) {
      await collection.updateOne(
        { _id: war._id, status: "active" },
        { $set: { status: "completed", finishedAt: now, finishReason: "all_matchups_resolved" } },
      );
      war = await collection.findOne({ _id: war._id });
    }
    return { ok: true, war };
  },
};
