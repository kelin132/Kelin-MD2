/**
 * KELIN MD — Cards system database helpers
 * Collections: mn_users, mn_cards, mn_card_market, mn_spawn_settings
 */
import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function uid(sender) {
  return (sender ?? "").split("@")[0].split(":")[0];
}

export function tag(jid) {
  return `@${uid(jid)}`;
}

export function fmt(n) {
  return Number(n || 0).toLocaleString();
}

// ── Collections ───────────────────────────────────────────────────────────────
// getDb() is already a synchronous singleton getter, so collection access does
// not need an extra promise hop. Existing `await Col.users()` callers remain
// compatible because awaiting a non-Promise returns it unchanged.
// Usage: const col = Col.users();  await col.findOne(...)

export const Col = {
  users:  () => getDb().collection("mn_users"),
  cards:  () => getDb().collection("mn_cards"),
  market: () => getDb().collection("mn_card_market"),
  spawns: () => getDb().collection("mn_spawn_settings"),
};

// ── User helpers ──────────────────────────────────────────────────────────────

/**
 * Find or create a user. Returns the document with a save() method attached.
 */
export async function findOrCreateUser(sender) {
  const col    = await Col.users();
  // Normalize the sender to strip device suffixes and handle JID/LID split
  const normalized = normalizeJid(sender);
  const userId = normalized.split("@")[0];

  // One upsert handles both the common read and first-use creation path. This
  // avoids the usual find-then-insert round trip and is safe when two commands
  // arrive for a new user at the same time.
  const userDefaults = {
    userId,
    whatsappNumber: normalized,
    balance:    0,
    cards:      [],
    cardLimit:  Infinity,
    totalCards: 0,
    username:   null,
    createdAt:   new Date(),
  };
  const user = await col.findOneAndUpdate(
    { userId },
    { $setOnInsert: userDefaults },
    { upsert: true, returnDocument: "after", includeResultMetadata: false },
  );

  user.markModified = () => {}; // no-op — raw driver doesn't need it
  user.save = async () => {
    const c = Col.users();
    const { _id, save, markModified, ...data } = user;
    await c.updateOne({ userId }, { $set: data });
  };

  return user;
}

/**
 * Find a user without creating one. Returns null if not found.
 */
export async function getUser(sender) {
  const col    = await Col.users();
  const normalized = normalizeJid(sender);
  const userId = normalized.split("@")[0];
  const user   = await col.findOne({ userId });
  if (!user) return null;

  user.markModified = () => {};
  user.save = async () => {
    const c = Col.users();
    const { _id, save, markModified, ...data } = user;
    await c.updateOne({ userId }, { $set: data });
  };
  return user;
}

// ── Spawn settings (used by cardspawn.js + autoSpawn.js) ─────────────────────

export async function isSpawnEnabled(chatId) {
  const col = await Col.spawns();
  const doc = await col.findOne({ chatId });
  return doc?.enabled === true;
}

export async function setSpawnEnabled(chatId, enabled) {
  const col = await Col.spawns();
  await col.updateOne(
    { chatId },
    { $set: { chatId, enabled } },
    { upsert: true }
  );
}

export async function getEnabledSpawnChats() {
  const col  = await Col.spawns();
  const docs = await col.find({ enabled: true }).toArray();
  return docs.map(d => d.chatId);
}
