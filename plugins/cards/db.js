/**
 * KELIN MD — Cards system database helpers
 * Collections: mn_users, mn_cards, mn_card_market, mn_spawn_settings
 */
import { getDb } from "../../lib/mongo.mjs";

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
// Each method is async — always await the call before chaining .find()/.insertOne() etc.
// Usage: const col = await Col.users();  await col.findOne(...)

export const Col = {
  users:  async () => (await getDb()).collection("mn_users"),
  cards:  async () => (await getDb()).collection("mn_cards"),
  market: async () => (await getDb()).collection("mn_card_market"),
  spawns: async () => (await getDb()).collection("mn_spawn_settings"),
};

// ── User helpers ──────────────────────────────────────────────────────────────

/**
 * Find or create a user. Returns the document with a save() method attached.
 */
export async function findOrCreateUser(sender) {
  const col    = await Col.users();
  const userId = uid(sender);

  let user = await col.findOne({ userId });
  if (!user) {
    user = {
      userId,
      whatsappNumber: sender,
      balance:    0,
      cards:      [],
      cardLimit:  250,
      totalCards: 0,
      username:   null,
      createdAt:  new Date(),
    };
    const { insertedId } = await col.insertOne(user);
    user._id = insertedId;
  }

  user.markModified = () => {}; // no-op — raw driver doesn't need it
  user.save = async () => {
    const c = await Col.users();
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
  const userId = uid(sender);
  const user   = await col.findOne({ userId });
  if (!user) return null;

  user.markModified = () => {};
  user.save = async () => {
    const c = await Col.users();
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
