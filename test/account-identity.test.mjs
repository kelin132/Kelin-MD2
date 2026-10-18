import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const writes = [];
const account = {
  _id: "123456789@lid", registered: true, name: "Trainer",
  phoneNumber: "263771234567", websiteId: "AID-E225E6E134",
  money: 1234, bank: 50, inventory: [],
};
const collection = {
  async findOne(query) {
    if (query._id) return query._id === account._id ? { ...account } : null;
    return { ...account };
  },
  async updateOne(query, update) {
    writes.push({ query, update });
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  },
  async updateMany() { return { modifiedCount: 0 }; },
  async insertOne() { throw new Error("Must not copy an account's unique websiteId"); },
  async deleteOne() { throw new Error("Must not delete a signed-in account"); },
  listIndexes() { return { async toArray() {
    return [{ name: "users_websiteId_unique", key: { websiteId: 1 }, unique: true, sparse: true }];
  } }; },
};
globalThis.__identityTestDb = { collection: () => collection };
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/mongo.mjs")) return {
      format: "module", shortCircuit: true,
      source: "export function getDb() { return globalThis.__identityTestDb; }",
    };
    return nextLoad(url, context);
  },
});
const { getUser, saveUser, addMoney, isRegistered } = await import("../plugins/economy/database.js");
const { migrateLidData } = await import("../lib/identity.mjs");
const { getOrCreateWebsiteId } = await import("../lib/websiteAuth.mjs");

test("legacy account reads and saves keep the original key and unique website ID", async () => {
  writes.length = 0;
  const user = await getUser("263771234567@s.whatsapp.net");
  assert.equal(user.money, 1234);
  assert.equal(user.websiteId, account.websiteId);
  user.money += 10;
  await saveUser("263771234567@s.whatsapp.net", user);
  const save = writes.find(({ update }) => update.$inc?.money === 10);
  assert.equal(save.query._id, account._id);
  assert.equal(await isRegistered("263771234567@s.whatsapp.net"), true);
});

test("direct balance changes resolve the stored identity", async () => {
  writes.length = 0;
  await addMoney("263771234567@s.whatsapp.net", 25);
  assert.equal(writes[0].query._id, account._id);
});

test("verified LID mapping retains the website account without copying or deleting it", async () => {
  writes.length = 0;
  // Only legacy auxiliary collections are absent in this fixture.
  globalThis.__identityTestDb = {
    collection: (name) => name === "users" || name === "mn_users"
      ? collection : { findOne: async () => null },
  };
  await migrateLidData(account._id, "263771234567@s.whatsapp.net");
  assert.equal(writes[0].query._id, account._id);
  assert.deepEqual(writes[0].update.$addToSet.identityAliases.$each,
    [account._id, "263771234567@s.whatsapp.net"]);
});

test("website ID commands find the stable legacy account", async () => {
  assert.equal(await getOrCreateWebsiteId("263771234567@s.whatsapp.net"), account.websiteId);
});
