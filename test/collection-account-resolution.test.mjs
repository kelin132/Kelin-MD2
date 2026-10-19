import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { BSON, ObjectId } from "mongodb";

const phone = "263771234567@s.whatsapp.net";
const lid = "123456789@lid";
const other = "263779999999@s.whatsapp.net";
const clone = (value) => value == null ? value : BSON.deserialize(BSON.serialize({ value })).value;
const equal = (a, b) => isDeepStrictEqual(a, b);

function matches(doc, query) {
  return Object.entries(query).every(([field, expected]) => {
    if (field === "$or") return expected.some((clause) => matches(doc, clause));
    const actual = doc[field];
    if (expected && !Array.isArray(expected) && typeof expected === "object" && !(expected instanceof ObjectId)) {
      if ("$in" in expected) return expected.$in.some((value) =>
        Array.isArray(actual) ? actual.some((item) => equal(item, value)) : equal(actual, value));
      if ("$ne" in expected) return !equal(actual, expected.$ne);
    }
    return equal(actual, expected);
  });
}

let documents;
let creations;
function collection(name) {
  const rows = documents[name] ??= [];
  return {
    find(query) { return { toArray: async () => rows.filter((row) => matches(row, query)).map(clone) }; },
    async findOne(query) { return clone(rows.find((row) => matches(row, query))); },
    async countDocuments(query) { return rows.filter((row) => matches(row, query)).length; },
    async insertOne(doc) { creations++; rows.push(clone(doc)); },
    async findOneAndUpdate(query, update, options = {}) {
      await this.updateOne(query, update, options);
      return this.findOne(query);
    },
    async updateMany(query, update) {
      for (const row of rows.filter((row) => matches(row, query))) await this.updateOne({ _id: row._id }, update);
      return { modifiedCount: 1 };
    },
    async updateOne(query, update, options = {}) {
      if (name === "economy_migrations") return { upsertedCount: 0, matchedCount: 1 };
      let row = rows.find((row) => matches(row, query));
      if (!row && options.upsert) {
        creations++;
        row = { _id: new ObjectId(), ...clone(query), ...clone(update.$setOnInsert || {}) };
        rows.push(row);
      }
      if (!row) return { matchedCount: 0, upsertedCount: 0 };
      Object.assign(row, clone(update.$set || {}));
      for (const [key, amount] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + amount;
      for (const [key, item] of Object.entries(update.$addToSet || {})) {
        row[key] ??= [];
        if (!row[key].some((value) => equal(value, item))) row[key].push(clone(item));
      }
      for (const [key, item] of Object.entries(update.$pull || {})) {
        row[key] = (row[key] || []).filter((value) => !equal(value, item));
      }
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    },
  };
}

globalThis.__collectionDb = { collection };
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/mongo.mjs")) return {
      format: "module", shortCircuit: true,
      source: "export const getDb = () => globalThis.__collectionDb;",
    };
    return nextLoad(url, context);
  },
});

const cardsDb = await import("../plugins/cards/db.js");
const trainers = await import("../lib/pokemon/players.mjs");
const pokemonDb = await import("../lib/pokemon/pokemonDb.mjs");
const { getUser: economyUser } = await import("../plugins/economy/database.js");
const { accountIdentityValues } = await import("../lib/collectionIdentity.mjs");
const { default: collectionCommand } = await import("../plugins/cards/col.js");

beforeEach(() => {
  creations = 0;
  documents = {
    users: [
      { _id: phone, registered: true, name: "Player A", money: 4321 },
      { _id: lid, registered: true, phoneNumber: "263771234567" },
      { _id: other, registered: true, name: "Player B", money: 9876 },
    ],
    mn_users: [
      { _id: "old-cards", userId: 123456789, cards: [{ cardId: "pikachu", name: "Old copy" }], totalCards: 1 },
      { _id: phone, cards: [{ cardId: "pikachu", name: "Second copy" }], totalCards: 1 },
      { _id: "empty-phone", userId: "263771234567", cards: [], totalCards: 0 },
      { _id: "other-cards", userId: "263779999999", cards: [{ cardId: "mew", name: "Other user copy" }], totalCards: 1 },
    ],
    pokemon_trainers: [
      { _id: "old-trainer", jid: lid, username: "Player A", party: ["p1"], pc: ["p2"], coins: 250, inventory: { pokeball: 3 } },
      { _id: "empty-trainer", jid: phone, party: [], pc: [], coins: 1000 },
      { _id: "other-trainer", jid: other, party: ["p4"], pc: [], coins: 500 },
    ],
    pokemon_owned: [
      { _id: "p1", ownerJid: lid, inParty: true, name: "Pikachu" },
      { _id: "p2", owner: 123456789, inParty: false, name: "Mew" },
      { _id: "p3", ownerJid: phone, inParty: false, name: "Eevee" },
      { _id: "p4", ownerJid: other, inParty: true, name: "Other Pokemon" },
    ],
  };
});

test("economy, cards and Pokemon all resolve the same account and isolate other users", async () => {
  assert.equal((await economyUser(phone)).money, 4321);
  assert.equal((await cardsDb.getUser(phone)).cards.length, 2);
  assert.equal((await cardsDb.getUser(other)).cards.length, 1);
  assert.deepEqual((await pokemonDb.getAllTrainerPokemon(phone)).map((doc) => doc._id), ["p1", "p2", "p3"]);
  assert.deepEqual((await pokemonDb.getAllTrainerPokemon(other)).map((doc) => doc._id), ["p4"]);
  assert.equal(await pokemonDb.countTrainerPokemon(phone), 3);
  assert.equal((await pokemonDb.getTrainerParty(phone)).length, 1);
  assert.equal((await pokemonDb.getTrainerPC(phone)).length, 2);
  const keys = await accountIdentityValues(phone);
  assert.ok(keys.includes(lid));
  assert.ok(!keys.includes("123456789@s.whatsapp.net"));
});

test("collection reads do not create empty replacement accounts or reset cards", async () => {
  const user = await cardsDb.findOrCreateUser(phone);
  assert.equal(user.cards.length, 2);
  assert.equal(creations, 0);
  assert.equal((await trainers.createTrainer(phone, "New name"))._id, "old-trainer");
  assert.equal(creations, 0);
});

test("card saves retain both copies and write back to the original owner records", async () => {
  const user = await cardsDb.findOrCreateUser(phone);
  const [removed] = user.cards.splice(0, 1);
  user.cards.push({ cardId: "new-card", name: "New copy" });
  await user.save();
  assert.equal((await cardsDb.getUser(phone)).cards.length, 2);
  assert.equal((await cardsDb.getUser(other)).cards.length, 1);
  assert.ok(!documents.mn_users.flatMap((doc) => doc.cards).some((card) => card.name === removed.name));
  assert.equal(documents.mn_users.find((doc) => doc._id === "old-cards").cards.length, 1);
  assert.equal(documents.mn_users.find((doc) => doc._id === phone).cards.length, 1);
  await user.save();
  assert.equal((await cardsDb.getUser(phone)).cards.length, 2);
});

test("trainer mutations update the populated legacy trainer, not an empty canonical record", async () => {
  assert.equal((await trainers.getTrainer(phone))._id, "old-trainer");
  await trainers.addCoins(phone, 25);
  await trainers.addToPC(phone, "p3");
  await trainers.setLeadPokemonId(phone, "p1");
  await trainers.removeFromParty(phone, "p1");
  const legacy = documents.pokemon_trainers.find((doc) => doc._id === "old-trainer");
  assert.equal(legacy.coins, 275);
  assert.ok(legacy.pc.includes("p3"));
  assert.equal(legacy.leadPokemonId, "p1");
  assert.deepEqual(legacy.party, []);
  assert.equal(documents.pokemon_trainers.find((doc) => doc._id === "empty-trainer").coins, 1000);
  assert.equal(documents.pokemon_trainers.find((doc) => doc._id === "other-trainer").coins, 500);
});

test("a new user's card record can still be created and saved", async () => {
  const user = await cardsDb.findOrCreateUser("263778888888@s.whatsapp.net");
  user.cards.push({ cardId: "starter", name: "Starter copy" });
  await user.save();
  assert.equal((await cardsDb.getUser("263778888888@s.whatsapp.net")).cards.length, 1);
});

test("the actual collection command renders recovered cards for each user", async () => {
  const messages = [];
  const sock = { sendMessage: async (jid, payload) => { messages.push(payload.text); } };
  const msg = { key: { remoteJid: "fixture@g.us" } };
  await collectionCommand.run({ sock, msg, sender: phone, args: [] });
  await collectionCommand.run({ sock, msg, sender: other, args: [] });
  assert.match(messages[0], /Old copy/);
  assert.match(messages[0], /Second copy/);
  assert.doesNotMatch(messages[0], /Other user copy/);
  assert.match(messages[1], /Other user copy/);
  assert.doesNotMatch(messages[1], /Old copy/);
});

test("transfers remove a legacy copy from its source and save it only to the recipient", async () => {
  const sender = await cardsDb.getUser(phone);
  const target = await cardsDb.getUser(other);
  target.cards.push(sender.cards.splice(0, 1)[0]);
  await sender.save();
  await target.save();
  assert.equal((await cardsDb.getUser(phone)).cards.length, 1);
  assert.equal((await cardsDb.getUser(other)).cards.length, 2);
  assert.equal(documents.mn_users.reduce((sum, doc) => sum + doc.cards.length, 0), 3);
});

test("verified Discord links expose the same cards, pending cards and Pokemon to WhatsApp", async () => {
  const discord = "discord:123456789012345678";
  documents.account_links = [{ whatsappId: phone, discordId: "123456789012345678", status: "active" }];
  documents.mn_users.push({ _id: "discord-cards", userId: discord, cards: [{ cardId: "dc", name: "Discord copy" }], pendingCards: [{ cardId: "pending" }] });
  documents.pokemon_owned.push({ _id: "p5", ownerJid: discord, inParty: false });
  assert.deepEqual((await cardsDb.getUser(phone)).cards, (await cardsDb.getUser(discord)).cards);
  assert.equal((await cardsDb.getUser(phone)).cards.length, 3);
  assert.equal((await cardsDb.getUser(phone)).pendingCards.length, 1);
  assert.equal(await pokemonDb.countTrainerPokemon(phone), 4);
});
