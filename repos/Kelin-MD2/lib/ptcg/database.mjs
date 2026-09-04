/**
 * Pokémon TCG Pocket collection storage.
 *
 * This intentionally uses its own collections and user documents so it never
 * changes the existing anime card system or the Pokémon RPG trainer records.
 */
import { ObjectId } from "mongodb";
import { getDb } from "../mongo.mjs";
import { normalizeJid } from "../identity.mjs";

function playerCollection() {
  return getDb().collection("ptcg_players");
}

function marketCollection() {
  return getDb().collection("ptcg_market");
}

function tradeCollection() {
  return getDb().collection("ptcg_trades");
}

function playerId(jid) {
  return normalizeJid(jid);
}

function cleanPlayer(doc) {
  if (!doc) return null;
  return {
    ...doc,
    cards: Array.isArray(doc.cards) ? doc.cards : [],
  };
}

export function newOwnedId() {
  return new ObjectId().toString();
}

export async function getPlayer(jid) {
  return cleanPlayer(await playerCollection().findOne({ jid: playerId(jid) }));
}

export async function getOrCreatePlayer(jid, username = "Trainer") {
  const id = playerId(jid);
  const existing = await playerCollection().findOne({ jid: id });
  if (existing) return cleanPlayer(existing);

  const player = {
    jid: id,
    username: username || "Trainer",
    cards: [],
    packsOpened: 0,
    cardsPulled: 0,
    createdAt: new Date(),
  };
  await playerCollection().insertOne(player);
  return cleanPlayer(player);
}

export async function addCards(jid, cards) {
  const ownedCards = cards.map((card) => ({
    ...card,
    ownedId: card.ownedId || newOwnedId(),
    obtainedAt: card.obtainedAt || new Date(),
  }));
  await playerCollection().updateOne(
    { jid: playerId(jid) },
    {
      $push: { cards: { $each: ownedCards } },
      $inc: { cardsPulled: ownedCards.length },
    },
    { upsert: true },
  );
  return ownedCards;
}

export async function incrementPacksOpened(jid) {
  await playerCollection().updateOne(
    { jid: playerId(jid) },
    { $inc: { packsOpened: 1 } },
    { upsert: true },
  );
}

export async function removeOwnedCard(jid, ownedId) {
  const id = playerId(jid);
  const player = await playerCollection().findOne({ jid: id });
  const card = player?.cards?.find((item) => item.ownedId === ownedId);
  if (!card) return null;

  const result = await playerCollection().findOneAndUpdate(
    { jid: id, "cards.ownedId": ownedId },
    { $pull: { cards: { ownedId: ownedId } } },
    { returnDocument: "before", includeResultMetadata: false },
  );
  return result ? card : null;
}

export async function restoreCard(jid, card) {
  if (!card) return;
  await playerCollection().updateOne(
    { jid: playerId(jid) },
    { $push: { cards: card } },
    { upsert: true },
  );
}

export async function getMarketListings(limit = 100) {
  return marketCollection()
    .find({ status: "active" })
    .sort({ listedAt: 1 })
    .limit(limit)
    .toArray();
}

export async function createListing(listing) {
  const result = await marketCollection().insertOne({
    ...listing,
    sellerJid: playerId(listing.sellerJid),
    status: "active",
    listedAt: new Date(),
  });
  return { ...listing, sellerJid: playerId(listing.sellerJid), _id: result.insertedId, status: "active" };
}

export async function getListingById(id) {
  try {
    return await marketCollection().findOne({
      _id: ObjectId.createFromHexString(String(id)),
      status: "active",
    });
  } catch {
    return null;
  }
}

export async function removeListing(id, sellerJid = null) {
  const filter = { _id: id, status: "active" };
  if (sellerJid) filter.sellerJid = playerId(sellerJid);
  const result = await marketCollection().findOneAndDelete(filter);
  return result || null;
}

export async function createTradeOffer(offer) {
  const result = await tradeCollection().insertOne({
    ...offer,
    fromJid: playerId(offer.fromJid),
    toJid: playerId(offer.toJid),
    status: "pending",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  return { ...offer, _id: result.insertedId, status: "pending" };
}

export async function getIncomingTrade(jid) {
  return tradeCollection().findOne({
    toJid: playerId(jid),
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
}

export async function getOutgoingTrade(jid) {
  return tradeCollection().findOne({
    fromJid: playerId(jid),
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
}

export async function deleteTrade(id) {
  return tradeCollection().deleteOne({ _id: id, status: "pending" });
}

export async function acceptTrade(id) {
  return tradeCollection().findOneAndUpdate(
    { _id: id, status: "pending", expiresAt: { $gt: new Date() } },
    { $set: { status: "accepted", acceptedAt: new Date() } },
    { returnDocument: "before", includeResultMetadata: false },
  );
}

export async function debitEconomy(jid, amount) {
  const result = await getDb().collection("users").findOneAndUpdate(
    {
      _id: playerId(jid),
      registered: true,
      money: { $gte: amount },
    },
    { $inc: { money: -amount } },
    { returnDocument: "after", includeResultMetadata: false },
  );
  return result || null;
}

export async function creditEconomy(jid, amount) {
  await getDb().collection("users").updateOne(
    { _id: playerId(jid), registered: true },
    { $inc: { money: amount } },
  );
}