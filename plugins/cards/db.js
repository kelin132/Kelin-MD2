/**
 * KELIN MD — Cards system database helpers
 * Collections: mn_users, mn_cards, mn_card_market, mn_spawn_settings
 */
import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";
import { BSON } from "mongodb";
import { accountIdentityValues, collectionIdentityQuery } from "../../lib/collectionIdentity.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function uid(sender) {
  const raw = String(sender ?? "");
  return raw.startsWith("discord:") ? raw : raw.split("@")[0].split(":")[0];
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
  const existing = await getUser(sender);
  if (existing) return existing;
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

  return attachCardSave([user]);
}

/**
 * Find a user without creating one. Returns null if not found.
 */
export async function getUser(sender) {
  const col    = await Col.users();
  const values = await accountIdentityValues(sender);
  const records = (await col.find(collectionIdentityQuery(values,
    ["_id", "userId", "jid", "owner"],
  )).toArray()).filter(record => record.userId !== "discord");
  if (!records.length) return null;
  // An empty recently-created phone record must not hide an older collection.
  records.sort((a, b) => (b.cards?.length || 0) - (a.cards?.length || 0) ||
    String(a._id).localeCompare(String(b._id)));
  return attachCardSave(records);
}

function attachCardSave(records) {
  const primary = records[0];
  const sources = new WeakMap();
  const originals = new Map();
  const pendingSources = new WeakMap();
  const pendingOriginals = new Map();
  const pendingCards = records.flatMap(record => {
    const pending = Array.isArray(record.pendingCards) ? record.pendingCards : [];
    pendingOriginals.set(record, BSON.deserialize(BSON.serialize({ pending })).pending);
    for (const card of pending) if (card && typeof card === "object") pendingSources.set(card, record);
    return pending;
  });
  const cards = records.flatMap((record) => {
    const owned = Array.isArray(record.cards) ? record.cards : [];
    originals.set(record, BSON.deserialize(BSON.serialize({ cards: owned })).cards);
    for (const card of owned) {
      if (card && typeof card === "object") sources.set(card, record);
    }
    return owned;
  });
  const user = { ...primary, cards, pendingCards, totalCards: cards.length };
  user.markModified = () => {};
  user.save = async () => {
    const { _id, save, markModified, cards: currentCards, pendingCards: currentPending, totalCards, ...data } = user;
    const grouped = new Map(records.map((record) => [record, []]));
    const groupedPending = new Map(records.map(record => [record, []]));
    for (const card of currentPending) {
      const source = card && typeof card === "object" ? pendingSources.get(card) : null;
      groupedPending.get(source || primary).push(card);
    }
    for (const card of currentCards) {
      // New or transferred copies belong to this account's primary record.
      const source = card && typeof card === "object" ? sources.get(card) : null;
      grouped.get(source || primary).push(card);
    }
    for (const record of records) {
      const owned = grouped.get(record);
      const pending = groupedPending.get(record);
      const result = await Col.users().updateOne(
        {
          _id: record._id,
          ...(Array.isArray(record.cards) ? { cards: originals.get(record) } : {}),
          ...(Array.isArray(record.pendingCards) ? { pendingCards: pendingOriginals.get(record) } : {}),
        },
        { $set: {
          ...(record === primary ? data : {}),
          cards: owned,
          pendingCards: pending,
          totalCards: owned.length,
        } },
      );
      if (result.matchedCount === 0) throw new Error("Your collection changed. Reload it and retry.");
      originals.set(record, BSON.deserialize(BSON.serialize({ cards: owned })).cards);
      record.cards = owned;
      pendingOriginals.set(record, BSON.deserialize(BSON.serialize({ pending })).pending);
      record.pendingCards = pending;
      for (const card of pending) if (card && typeof card === "object") pendingSources.set(card, record);
      for (const card of owned) {
        if (card && typeof card === "object") sources.set(card, record);
      }
    }
    user.totalCards = currentCards.length;
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
