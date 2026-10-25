import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { BSON, ObjectId } from "mongodb";

const phone = "263771234567@s.whatsapp.net";
const lid = "263779999999@lid";
const other = "263779999999@s.whatsapp.net";
const clone = (value) => value == null ? value : BSON.deserialize(BSON.serialize({ value })).value;
const equal = (a, b) => isDeepStrictEqual(a, b);

function matches(doc, query) {
  return Object.entries(query).every(([field, expected]) => {
    if (field === "$or") return expected.some((clause) => matches(doc, clause));
    if (field === "$and") return expected.every((clause) => matches(doc, clause));
    const actual = doc[field];
    if (expected && !Array.isArray(expected) && typeof expected === "object" && !(expected instanceof ObjectId)) {
      return Object.entries(expected).every(([operator, value]) => {
        if (operator === "$in") return value.some((candidate) =>
          Array.isArray(actual) ? actual.some((item) => equal(item, candidate)) : equal(actual, candidate));
        if (operator === "$nin") return !value.some((candidate) =>
          Array.isArray(actual) ? actual.some((item) => equal(item, candidate)) : equal(actual, candidate));
        if (operator === "$ne") return !equal(actual, value);
        if (operator === "$exists") return (actual !== undefined) === value;
        if (operator === "$not" && value instanceof RegExp) return typeof actual !== "string" || !value.test(actual);
        throw new Error(`Unsupported fixture operator ${operator}`);
      });
    }
    return equal(actual, expected);
  });
}

let documents;
let creations;
let findReads;
function collection(name) {
  const rows = documents[name] ??= [];
  return {
    find(query) {
      findReads++;
      return { toArray: async () => rows.filter((row) => matches(row, query)).map(clone) };
    },
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
      if (name === "economy_migrations") throw new Error("Reading a player must not initialize a global wallet reset");
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
        const values = item?.$each || [item];
        for (const value of values) {
          if (!row[key].some((existing) => equal(existing, value))) row[key].push(clone(value));
        }
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
const {
  getUser: economyUser,
  isRegistered: economyIsRegistered,
} = await import("../plugins/economy/database.js");
const { resolveMessageSender } = await import("../lib/identity.mjs");
const { accountIdentityValues, invalidateAccountIdentityValues } = await import("../lib/collectionIdentity.mjs");
const { default: collectionCommand } = await import("../plugins/cards/col.js");

beforeEach(() => {
  creations = 0;
  findReads = 0;
  for (const identity of [phone, lid, other]) invalidateAccountIdentityValues(identity);
  documents = {
    users: [
      { _id: phone, registered: true, name: "Player A", money: 4321 },
      { _id: lid, registered: true, phoneNumber: "263771234567" },
      { _id: other, registered: true, name: "Player B", money: 9876 },
    ],
    mn_users: [
      { _id: "old-cards", userId: lid, cards: [{ cardId: "pikachu", name: "Old copy" }], totalCards: 1 },
      { _id: phone, cards: [{ cardId: "pikachu", name: "Second copy" }], totalCards: 1 },
      { _id: "empty-phone", userId: "263771234567", cards: [], totalCards: 0 },
      { _id: "other-cards", userId: "263779999999", whatsappNumber: phone, identityAliases: [lid, phone], cards: [{ cardId: "mew", name: "Other user copy" }], totalCards: 1 },
    ],
    pokemon_trainers: [
      { _id: "old-trainer", jid: lid, username: "Player A", party: ["p1"], pc: ["p2"], coins: 250, inventory: { pokeball: 3 } },
      { _id: "empty-trainer", jid: phone, party: [], pc: [], coins: 1000 },
      { _id: "other-trainer", jid: other, party: ["p4"], pc: [], coins: 500 },
    ],
    pokemon_owned: [
      { _id: "p1", ownerJid: lid, inParty: true, name: "Pikachu" },
      { _id: "p2", owner: lid, inParty: false, name: "Mew" },
      { _id: "p3", ownerJid: phone, inParty: false, name: "Eevee" },
      { _id: "p4", ownerJid: other, inParty: true, name: "Other Pokemon" },
      { _id: "p5", owner: 263779999999, whatsappNumber: phone, identityAliases: [lid, phone], inParty: false, name: "Other user's numeric-owner Pokemon" },
    ],
  };
});

test("economy, cards and Pokemon all resolve the same account and isolate other users", async () => {
  assert.equal((await economyUser(phone)).money, 4321);
  assert.equal((await cardsDb.getUser(phone)).cards.length, 2);
  assert.equal((await cardsDb.getUser(other)).cards.length, 1);
  assert.deepEqual((await pokemonDb.getAllTrainerPokemon(phone)).map((doc) => doc._id), ["p1", "p2", "p3"]);
  assert.deepEqual((await pokemonDb.getAllTrainerPokemon(other)).map((doc) => doc._id), ["p4", "p5"]);
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

test("repeated explicit spawn copies appear once while legacy card copies remain untouched", async () => {
  const legacyRecord = documents.mn_users.find((doc) => doc._id === "old-cards");
  const phoneRecord = documents.mn_users.find((doc) => doc._id === phone);
  legacyRecord.cards.push({
    cardId: "card-with-spawn",
    spawnId: "instance-unique-001",
    name: "Spawned card",
    image: "https://example.test/card.png",
  });
  phoneRecord.cards.push({
    cardId: "card-with-spawn",
    spawnId: "instance-unique-001",
    name: "",
    series: "Recovered series",
  });

  const user = await cardsDb.getUser(phone);
  assert.equal(user.cards.length, 3);
  assert.equal(user.cards.filter((card) => card.spawnId === "instance-unique-001").length, 1);
  assert.equal(user.cards.find((card) => card.spawnId === "instance-unique-001").series, "Recovered series");
  assert.equal((await cardsDb.getUserProfileSummary(phone)).cardsCount, 3);
  // A read does not rewrite the backing documents.
  assert.equal(legacyRecord.cards.length + phoneRecord.cards.length, 4);

  await user.save();
  assert.equal((await cardsDb.getUser(phone)).cards.length, 3);
  assert.equal(documents.mn_users.reduce((total, record) => total + (record.cards?.length || 0), 0), 4);
  assert.ok(documents.mn_users.some((record) =>
    record.cards?.some((card) => card.spawnId === "instance-unique-001" && card.series === "Recovered series")));
});

test("account identity values reuse a short read and can be invalidated after a link", async () => {
  const first = await accountIdentityValues(phone);
  const readsAfterFirst = findReads;
  const second = await accountIdentityValues(phone);
  assert.deepEqual(second, first);
  assert.equal(findReads, readsAfterFirst);

  invalidateAccountIdentityValues(phone);
  await accountIdentityValues(phone);
  assert.ok(findReads > readsAfterFirst);
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

test("a LID command resolves the existing registered economy account and restores its legacy Pokemon", async () => {
  const sender = await resolveMessageSender(
    lid,
    phone,
    { signalRepository: { lidMapping: {} } },
    "fixture@g.us",
  );
  assert.equal(sender, phone);
  assert.equal(await economyIsRegistered(sender), true);
  assert.equal((await economyUser(sender)).money, 4321);
  assert.equal(documents.pokemon_trainers.find((trainer) => trainer._id === "old-trainer").whatsappNumber, undefined);
  const recovered = documents.pokemon_owned.filter((pokemon) => pokemon._id === "p1" || pokemon._id === "p2");
  assert.ok(recovered.every((pokemon) => pokemon.whatsappNumber === undefined));
  assert.ok(recovered.every((pokemon) => pokemon.identityAliases.includes(lid)));
  assert.deepEqual((await pokemonDb.getAllTrainerPokemon(sender)).map((pokemon) => pokemon._id),
    ["p1", "p2", "p3"]);
  assert.ok(documents.pokemon_owned.some((pokemon) => pokemon._id === "p1" && pokemon.ownerJid === lid));
  assert.equal((await cardsDb.getUser(phone)).cards.some((card) => card.name === "Other user copy"), false);
  assert.equal(documents.mn_users.find((user) => user._id === "other-cards").whatsappNumber, phone);
  assert.equal(documents.pokemon_owned.find((pokemon) => pokemon._id === "p5").whatsappNumber, phone);
});

test("ambiguous Discord links and unrelated owner fields cannot expose another user's records", async () => {
  const conflictingDiscord = "discord:999999999999999999";
  documents.account_links = [
    { whatsappId: phone, discordId: "123456789012345678", status: "active" },
    { whatsappId: phone, discordId: "999999999999999999", status: "active" },
  ];
  documents.users.push({
    _id: conflictingDiscord,
    discordId: "999999999999999999",
    owner: phone,
    registered: true,
    money: 987654,
  });
  documents.mn_users.push({
    _id: "conflicting-discord-cards",
    userId: conflictingDiscord,
    cards: [{ cardId: "foreign", name: "Must stay private" }],
  });

  const profile = await cardsDb.getUser(phone);
  assert.ok(!profile.cards.some((card) => card.name === "Must stay private"));
  assert.equal((await economyUser(phone)).money, 4321);
  assert.ok(!(await accountIdentityValues(phone)).includes(conflictingDiscord));
});
