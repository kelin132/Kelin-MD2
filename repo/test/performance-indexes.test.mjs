import test from "node:test";
import assert from "node:assert/strict";
import { ensurePerformanceIndexes } from "../lib/performanceIndexes.mjs";

test("performance indexes are submitted in one batch per collection", async () => {
  const calls = [];
  const backfills = [];
  const db = {
    collection(name) {
      return {
        async createIndexes(indexes) {
          calls.push({ name, indexes });
          return indexes.map((index) => index.name);
        },
        async updateMany(filter, update) {
          backfills.push({ name, filter, update });
          return { acknowledged: true, modifiedCount: 0 };
        },
      };
    },
  };

  await ensurePerformanceIndexes(db);

  assert.equal(calls.length, 9);
  assert.equal(calls.find((call) => call.name === "users").indexes.length, 6);
  assert.equal(calls.find((call) => call.name === "pokemon_trainers").indexes.length, 4);
  assert.equal(calls.find((call) => call.name === "mn_users").indexes.length, 4);
  assert.equal(backfills.length, 2);
});
