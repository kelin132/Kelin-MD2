/**
 * KELIN MD — Card System Database (MongoDB)
 * All card plugins import helpers from here.
 */
import { getDb } from "../../lib/mongo.mjs";

const COL_CARDS   = "card_collections"; // per-user cards
const COL_DROPS   = "card_drops";       // active / past drops per chat
const COL_TRADES  = "card_trades";      // trade offers
const COL_SETTINGS = "card_settings";   // per-chat settings (spawn enabled, etc.)

// ─── Card API ─────────────────────────────────────────────────────────────────

const API_BASE = "https://anime-db.p.rapidapi.com";
const API_HOST = "anime-db.p.rapidapi.com";

function getHeaders() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error(
      "RAPIDAPI_KEY is not set!\n\n" +
      "Add this to your bot's .env file:\n" +
      "RAPIDAPI_KEY=your_key_here\n\n" +
      "Get your key at: https://rapidapi.com/"
    );
  }
  return {
    "x-rapidapi-key":  key,
    "x-rapidapi-host": API_HOST,
  };
}

async function apiFetch(url) {
  const res = await fetch(url, { headers: getHeaders() });
  if (res.status === 401) {
    throw new Error(
      "Invalid or missing RAPIDAPI_KEY (401).\n" +
      "Check that RAPIDAPI_KEY is correctly set in your .env file\n" +
      "and that you are subscribed to the anime-db API on RapidAPI."
    );
  }
  if (!res.ok) throw new Error(`Card API error: ${res.status}`);
  return res.json();
}

export async function fetchRandomCard() {
  const randomPage = Math.floor(Math.random() * 1784) + 1;
  const json = await apiFetch(`${API_BASE}/character?page=${randomPage}&limit=20`);
  const cards = json.data ?? [];
  if (!cards.length) throw new Error("No cards returned from API");
  return cards[Math.floor(Math.random() * cards.length)];
}

export async function searchCardsApi(query, page = 1, limit = 10) {
  const params = new URLSearchParams({ name: query, page: String(page), limit: String(limit) });
  const json = await apiFetch(`${API_BASE}/character?${params}`);
  return { cards: json.data ?? [], pagination: json.pagination };
}

export async function browseCardsApi(page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const json = await apiFetch(`${API_BASE}/character?${params}`);
  return { cards: json.data ?? [], pagination: json.pagination };
}

/**
 * Fetch a card image as a Buffer (works for both .png and .gif).
 * The CDN path from the API is a root-relative path like /images/cards/...
 */
export async function fetchCardImage(cdnPath) {
  const url = `${API_BASE}${cdnPath}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Image fetch error: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// ─── User Collection ──────────────────────────────────────────────────────────

/**
 * Add a card to a user's collection.
 * Returns the inserted document ID.
 */
export async function addCardToUser(userId, card) {
  const db = await getDb();
  const doc = {
    userId,
    cardId:     card.id,
    cardName:   card.name,
    cardTier:   card.tier,
    cardSeries: card.series,
    cardCdn:    card.cdn,
    cardType:   card.type ?? null,
    obtainedAt: new Date(),
  };
  const result = await db.collection(COL_CARDS).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Get a user's card collection (paginated).
 * Returns { cards, total }.
 */
export async function getUserCards(userId, page = 1, limit = 10) {
  const db     = await getDb();
  const skip   = (page - 1) * limit;
  const filter = { userId };
  const [cards, total] = await Promise.all([
    db.collection(COL_CARDS).find(filter).sort({ obtainedAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection(COL_CARDS).countDocuments(filter),
  ]);
  return { cards, total };
}

/**
 * Get a user's single card by its Mongo ObjectId string.
 */
export async function getUserCardById(userId, entryId) {
  const { ObjectId } = await import("mongodb");
  const db = await getDb();
  return db.collection(COL_CARDS).findOne({ _id: new ObjectId(entryId), userId });
}

/**
 * Transfer ownership of a card entry to a new userId.
 */
export async function transferCard(entryId, newUserId) {
  const { ObjectId } = await import("mongodb");
  const db = await getDb();
  await db.collection(COL_CARDS).updateOne(
    { _id: new ObjectId(entryId) },
    { $set: { userId: newUserId } }
  );
}

// ─── Drops ────────────────────────────────────────────────────────────────────

/**
 * Return the unclaimed drop for a chat, or null.
 */
export async function getActiveDrop(chatId) {
  const db = await getDb();
  return db.collection(COL_DROPS).findOne({ chatId, claimedBy: null });
}

/**
 * Create a new drop in a chat.
 * Throws if an unclaimed drop already exists.
 */
export async function createDrop(chatId, card, droppedBy) {
  const db = await getDb();
  const existing = await getActiveDrop(chatId);
  if (existing) throw new Error("ALREADY_ACTIVE");
  const doc = {
    chatId,
    cardId:     card.id,
    cardName:   card.name,
    cardTier:   card.tier,
    cardSeries: card.series,
    cardCdn:    card.cdn,
    cardType:   card.type ?? null,
    droppedBy,
    droppedAt:  new Date(),
    claimedBy:  null,
    claimedAt:  null,
  };
  await db.collection(COL_DROPS).insertOne(doc);
  return doc;
}

/**
 * Claim the active drop in a chat for a user.
 * Returns the updated drop doc, or null if already claimed.
 */
export async function claimDrop(chatId, userId) {
  const db  = await getDb();
  const now = new Date();
  const result = await db.collection(COL_DROPS).findOneAndUpdate(
    { chatId, claimedBy: null },
    { $set: { claimedBy: userId, claimedAt: now } },
    { returnDocument: "after" }
  );
  return result ?? null;
}

// ─── Trades ───────────────────────────────────────────────────────────────────

/**
 * Create a trade offer.
 * offeredEntryId / requestedEntryId are ObjectId strings from COL_CARDS.
 */
export async function createTrade(fromUserId, toUserId, chatId, offeredEntryId, requestedEntryId) {
  const db = await getDb();
  const doc = {
    fromUserId,
    toUserId,
    chatId,
    offeredEntryId,
    requestedEntryId,
    status:    "pending",  // pending | accepted | rejected | cancelled
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection(COL_TRADES).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function getTradeById(tradeId) {
  const { ObjectId } = await import("mongodb");
  const db = await getDb();
  return db.collection(COL_TRADES).findOne({ _id: new ObjectId(tradeId) });
}

export async function updateTradeStatus(tradeId, status) {
  const { ObjectId } = await import("mongodb");
  const db = await getDb();
  await db.collection(COL_TRADES).updateOne(
    { _id: new ObjectId(tradeId) },
    { $set: { status, updatedAt: new Date() } }
  );
}

export async function getPendingTrades(userId) {
  const db = await getDb();
  return db.collection(COL_TRADES).find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    status: "pending",
  }).sort({ createdAt: -1 }).toArray();
}

// ─── Spawn Settings ───────────────────────────────────────────────────────────

export async function isSpawnEnabled(chatId) {
  const db  = await getDb();
  const doc = await db.collection(COL_SETTINGS).findOne({ _id: chatId });
  return !!(doc?.spawnEnabled);
}

export async function setSpawnEnabled(chatId, enabled) {
  const db = await getDb();
  await db.collection(COL_SETTINGS).updateOne(
    { _id: chatId },
    { $set: { spawnEnabled: enabled } },
    { upsert: true }
  );
}

/** Return all chatIds where spawn is enabled */
export async function getAllSpawnEnabledChats() {
  const db   = await getDb();
  const docs = await db.collection(COL_SETTINGS).find({ spawnEnabled: true }).toArray();
  return docs.map((d) => d._id);
}
