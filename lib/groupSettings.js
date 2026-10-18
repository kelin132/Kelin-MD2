/**
 * KELIN MD — Group Settings (MongoDB-backed, in-memory cache)
 *
 * Stores per-group settings (welcome, goodbye, antilink, antispam, …) in
 * MongoDB so they survive bot restarts, git pulls, and redeployments.
 *
 * Interface is intentionally synchronous (get/set/delete) so all existing
 * callers work without changes.  MongoDB writes happen async in the background.
 *
 * Boot sequence (index.js):
 *   await connectDb();
 *   await initGroupSettings();   ← loads all docs into the in-memory cache
 *   // now start the bot
 */

import { getDb } from "./mongo.mjs";

const COLLECTION = "groupSettings";
const ACTIVITY_KEY_PREFIX = "jid_";

function decodeActivityKey(value) {
  const key = String(value || "");
  if (!key.startsWith(ACTIVITY_KEY_PREFIX)) return key;
  try {
    return Buffer.from(key.slice(ACTIVITY_KEY_PREFIX.length), "base64url").toString("utf8");
  } catch {
    return key;
  }
}

function encodeActivityKey(value) {
  return `${ACTIVITY_KEY_PREFIX}${Buffer.from(String(value), "utf8").toString("base64url")}`;
}

function decodeActivityMap(value = {}, mode = "last") {
  const decoded = {};
  const visit = (entry, prefix = "") => {
    if (entry && typeof entry === "object" && !Array.isArray(entry) && !(entry instanceof Date)) {
      for (const [key, child] of Object.entries(entry)) {
        visit(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    if (!prefix) return;
    const key = decodeActivityKey(prefix);
    if (!Object.hasOwn(decoded, key)) {
      decoded[key] = entry;
    } else if (mode === "sum") {
      decoded[key] = (Number(decoded[key]) || 0) + (Number(entry) || 0);
    } else if (mode === "max") {
      decoded[key] = Math.max(Number(decoded[key]) || 0, Number(entry) || 0);
    } else {
      decoded[key] = entry;
    }
  };
  visit(value);
  return decoded;
}

function needsActivityNormalization(value = {}) {
  const keys = Object.keys(value);
  return keys.some((key) =>
    !key.startsWith(ACTIVITY_KEY_PREFIX) ||
    typeof value[key] !== "number",
  ) || new Set(keys.map(decodeActivityKey)).size !== keys.length;
}

function normalizedIdentityKey(value) {
  const identity = String(value || "");
  const at = identity.lastIndexOf("@");
  if (at < 0) return identity;
  return `${identity.slice(0, at).split(":")[0]}${identity.slice(at)}`;
}

function muteTimestamp(value) {
  const timestamp = new Date(value?.mutedAt || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

// ── In-memory cache ────────────────────────────────────────────────────────────
// Populated by initGroupSettings() at startup; kept in sync by set/delete.
let cache = {};
const activityFlushes = new Map();
const ACTIVITY_FLUSH_MS = 3000;

// ── Boot loader ────────────────────────────────────────────────────────────────

/**
 * Call once after connectDb() resolves.
 * Reads all group-settings documents from MongoDB into the local cache.
 */
export async function initGroupSettings() {
  try {
    const db   = getDb();
    const docs  = await db.collection(COLLECTION).find({}).toArray();
    cache = {};
    const normalizeWrites = [];
    for (const doc of docs) {
      const { _id, ...settings } = doc;
      const rawActivityCounts = settings.activityCounts || {};
      const rawActivityLastSeen = settings.activityLastSeen || {};
      settings.activityCounts = decodeActivityMap(rawActivityCounts, "sum");
      settings.activityLastSeen = decodeActivityMap(rawActivityLastSeen, "max");
      cache[_id] = settings;
      if (
        needsActivityNormalization(rawActivityCounts) ||
        needsActivityNormalization(rawActivityLastSeen)
      ) {
        normalizeWrites.push(
          db.collection(COLLECTION).updateOne(
            { _id },
            {
              $set: {
                activityCounts: Object.fromEntries(
                  Object.entries(settings.activityCounts)
                    .map(([identity, count]) => [encodeActivityKey(identity), count]),
                ),
                activityLastSeen: Object.fromEntries(
                  Object.entries(settings.activityLastSeen)
                    .map(([identity, timestamp]) => [encodeActivityKey(identity), timestamp]),
                ),
              },
            },
          ),
        );
      }
    }
    const normalized = await Promise.allSettled(normalizeWrites);
    for (const result of normalized) {
      if (result.status === "rejected") {
        console.error("[groupSettings] Activity-key migration failed:", result.reason?.message || result.reason);
      }
    }
    console.log(`[groupSettings] Loaded ${docs.length} group(s) from MongoDB`);
  } catch (err) {
    console.error("[groupSettings] Failed to load from MongoDB:", err.message);
    // Fall back to empty cache — bot still runs, settings just won't persist
    cache = {};
  }
}

// ── Async MongoDB helpers (fire-and-forget, with error logging) ───────────────

function mongoSet(jid, settings) {
  try {
    const db = getDb();
    db.collection(COLLECTION)
      .updateOne({ _id: jid }, { $set: settings }, { upsert: true })
      .catch(err => console.error(`[groupSettings] MongoDB set error (${jid}):`, err.message));
  } catch (err) {
    // getDb() throws before connectDb() — safe to ignore during early boot
    console.error("[groupSettings] MongoDB not ready:", err.message);
  }
}

function mongoDelete(jid) {
  try {
    const db = getDb();
    db.collection(COLLECTION)
      .deleteOne({ _id: jid })
      .catch(err => console.error(`[groupSettings] MongoDB delete error (${jid}):`, err.message));
  } catch (err) {
    console.error("[groupSettings] MongoDB not ready:", err.message);
  }
}

function scheduleActivityFlush(jid) {
  const pending = activityFlushes.get(jid);
  if (pending?.timer) return;
  const next = pending || { counts: new Map(), lastSeen: new Map() };
  next.timer = setTimeout(() => flushActivity(jid), ACTIVITY_FLUSH_MS);
  next.timer.unref?.();
  activityFlushes.set(jid, next);
}

function flushActivity(jid) {
  const pending = activityFlushes.get(jid);
  if (!pending) return;
  activityFlushes.delete(jid);
  try {
    const db = getDb();
    const increments = {};
    const lastSeen = {};
    for (const [sender, count] of pending.counts) {
      increments[`activityCounts.${encodeActivityKey(sender)}`] = count;
    }
    for (const [sender, timestamp] of pending.lastSeen) {
      lastSeen[`activityLastSeen.${encodeActivityKey(sender)}`] = timestamp;
    }
    if (!Object.keys(increments).length) return;
    db.collection(COLLECTION).updateOne(
      { _id: jid },
      { $inc: increments, $set: lastSeen },
      { upsert: true },
    ).catch((err) => console.error(`[groupSettings] Activity flush error (${jid}):`, err.message));
  } catch {
    // MongoDB is optional during startup; retain the in-memory activity state.
  }
}

// ── Public API (synchronous — reads from cache, writes also go to MongoDB) ────

class GroupSettings {
  get(jid) {
    return cache[jid] || {};
  }

  rekeyIdentity(sourceJid, targetJid) {
    const sourceKey = normalizedIdentityKey(sourceJid);
    const targetKey = normalizedIdentityKey(targetJid);
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const isSource = (key) => normalizedIdentityKey(key) === sourceKey;

    for (const settings of Object.values(cache)) {
      const mutedUsers = { ...(settings.mutedUsers || {}) };
      const sourceMutes = Object.entries(mutedUsers).filter(([key]) => isSource(key));
      if (sourceMutes.length) {
        const targetMute = mutedUsers[targetKey];
        const sourceMute = sourceMutes
          .map(([, value]) => value)
          .sort((a, b) => muteTimestamp(b) - muteTimestamp(a))[0];
        if (!targetMute || muteTimestamp(sourceMute) > muteTimestamp(targetMute)) {
          mutedUsers[targetKey] = sourceMute;
        }
        for (const [key] of sourceMutes) delete mutedUsers[key];
        settings.mutedUsers = mutedUsers;
      }

      for (const [field, mode] of [["activityCounts", "sum"], ["activityLastSeen", "max"]]) {
        const values = { ...(settings[field] || {}) };
        const sourceEntries = Object.entries(values).filter(([key]) => isSource(key));
        if (!sourceEntries.length) continue;
        const sourceValue = sourceEntries.reduce((result, [, value]) =>
          mode === "sum"
            ? result + (Number(value) || 0)
            : Math.max(result, Number(value) || 0),
        0);
        values[targetKey] = mode === "sum"
          ? (Number(values[targetKey]) || 0) + sourceValue
          : Math.max(Number(values[targetKey]) || 0, sourceValue);
        for (const [key] of sourceEntries) delete values[key];
        settings[field] = values;
      }
    }

    for (const pending of activityFlushes.values()) {
      for (const [map, mode] of [[pending.counts, "sum"], [pending.lastSeen, "max"]]) {
        const sourceEntries = [...map.entries()].filter(([key]) => isSource(key));
        if (!sourceEntries.length) continue;
        const sourceValue = sourceEntries.reduce((result, [, value]) =>
          mode === "sum"
            ? result + (Number(value) || 0)
            : Math.max(result, Number(value) || 0),
        0);
        map.set(targetKey, mode === "sum"
          ? (Number(map.get(targetKey)) || 0) + sourceValue
          : Math.max(Number(map.get(targetKey)) || 0, sourceValue));
        for (const [key] of sourceEntries) map.delete(key);
      }
    }
  }

  set(jid, settings) {
    cache[jid] = { ...cache[jid], ...settings };
    // Do not overwrite activity maps while their atomic increments are flushing.
    mongoSet(jid, settings);
  }

  recordActivity(jid, sender) {
    if (!jid?.endsWith("@g.us") || !sender) return;
    const current = cache[jid] || {};
    current.activityCounts ||= {};
    current.activityLastSeen ||= {};
    current.activityCounts[sender] = (current.activityCounts[sender] || 0) + 1;
    current.activityLastSeen[sender] = Date.now();
    cache[jid] = current;
    const pending = activityFlushes.get(jid) || { counts: new Map(), lastSeen: new Map() };
    pending.counts.set(sender, (pending.counts.get(sender) || 0) + 1);
    pending.lastSeen.set(sender, current.activityLastSeen[sender]);
    activityFlushes.set(jid, pending);
    scheduleActivityFlush(jid);
  }

  delete(jid) {
    const pending = activityFlushes.get(jid);
    if (pending?.timer) clearTimeout(pending.timer);
    activityFlushes.delete(jid);
    delete cache[jid];
    mongoDelete(jid);
  }
}

export const groupSettings = new GroupSettings();

export function recordGroupActivity(jid, sender) {
  groupSettings.recordActivity(jid, sender);
}
