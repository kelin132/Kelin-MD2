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

// ── In-memory cache ────────────────────────────────────────────────────────────
// Populated by initGroupSettings() at startup; kept in sync by set/delete.
let cache = {};

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
    for (const doc of docs) {
      const { _id, ...settings } = doc;
      cache[_id] = settings;
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

// ── Public API (synchronous — reads from cache, writes also go to MongoDB) ────

class GroupSettings {
  get(jid) {
    return cache[jid] || {};
  }

  set(jid, settings) {
    cache[jid] = { ...cache[jid], ...settings };
    mongoSet(jid, cache[jid]);
  }

  delete(jid) {
    delete cache[jid];
    mongoDelete(jid);
  }
}

export const groupSettings = new GroupSettings();
