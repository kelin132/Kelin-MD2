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

export const Col = {
  users:   () => getDb().collection("mn_users"),
  cards:   () => getDb().collection("mn_cards"),
  market:  () => getDb().collection("mn_card_market"),
  spawns:  () => getDb().collection("mn_spawn_settings"),
};

// ── User helpers ──────────────────────────────────────────────────────────────

/**
 * Find or create a user. Returns the document with a save() method attached.
 */
export async function findOrCreateUser(sender) {
  const col = Col.users();
  const userId = uid(sender);

  let user = await col.findOne({ userId });
  if (!user) {
    user = {
      userId,
      whatsappNumber: sender,
      balance: 0,
      cards: [],
      cardLimit: 100,
      totalCards: 0,
      username: null,
      createdAt: new Date(),
    };
    const { insertedId } = await col.insertOne(user);
    user._id = insertedId;
  }

  user.markModified = () => {}; // no-op — raw driver doesn't need it
  user.save = async () => {
    const { _id, save, markModified, ...data } = user;
    await col.updateOne({ userId }, { $set: data });
  };

  return user;
}

/**
 * Find a user without creating one. Returns null if not found.
 */
export async function getUser(sender) {
  const col = Col.users();
  const userId = uid(sender);
  const user = await col.findOne({ userId });
  if (!user) return null;

  user.markModified = () => {};
  user.save = async () => {
    const { _id, save, markModified, ...data } = user;
    await col.updateOne({ userId }, { $set: data });
  };
  return user;
}

// ── Spawn settings (used by cardspawn.js + cardSpawner.mjs) ──────────────────

export async function isSpawnEnabled(chatId) {
  const doc = await Col.spawns().findOne({ chatId });
  return doc?.enabled === true;
}

export async function setSpawnEnabled(chatId, enabled) {
  await Col.spawns().updateOne(
    { chatId },
    { $set: { chatId, enabled } },
    { upsert: true }
  );
}

export async function getEnabledSpawnChats() {
  const docs = await Col.spawns().find({ enabled: true }).toArray();
  return docs.map(d => d.chatId);
}
