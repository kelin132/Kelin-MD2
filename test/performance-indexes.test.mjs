import test from "node:test";
import assert from "node:assert/strict";
import { ensurePerformanceIndexes } from "../lib/performanceIndexes.mjs";

test("index maintenance lists once per collection and reuses equivalent index keys", async () => {
  const listed = new Map();
  const created = [];
  const db = {
    collection(name) {
      return {
        listIndexes() {
          listed.set(name, (listed.get(name) || 0) + 1);
          return { async toArray() {
            if (name === "users") return [{ name: "legacy_user_id_index", key: { userId: 1 } }];
            return [];
          } };
        },
        async createIndex(spec, options) { created.push({ name, spec, options }); },
        async updateMany() { return { modifiedCount: 0 }; },
      };
    },
  };
  await Promise.all([ensurePerformanceIndexes(db), ensurePerformanceIndexes(db)]);
  assert.ok([...listed.values()].every((count) => count === 1));
  assert.ok(!created.some(({ name, spec }) => name === "users" && spec.userId === 1));
  assert.ok(created.some(({ name, spec }) => name === "users" && spec.whatsappId === 1));
  assert.ok(created.some(({ name, spec }) => name === "pokemon_owned" && spec.ownerJid === 1));
});
