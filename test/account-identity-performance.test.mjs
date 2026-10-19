import test from "node:test";
import assert from "node:assert/strict";
import { resolveAccountIdentity } from "../lib/accountIdentity.mjs";

test("identity resolution batches independent Mongo reads and coalesces concurrent requests", async () => {
  let active = 0;
  let peak = 0;
  let queries = 0;
  const userFindOptions = [];
  const db = {
    collection() {
      return {
        find(query, options) {
          if (options) userFindOptions.push(options);
          return {
            async toArray() {
              queries++;
              active++;
              peak = Math.max(peak, active);
              await new Promise(resolve => setTimeout(resolve, 5));
              active--;
              return [];
            },
          };
        },
      };
    },
  };
  const [first, simultaneous] = await Promise.all([
    resolveAccountIdentity(db, "263771234567@s.whatsapp.net"),
    resolveAccountIdentity(db, "263771234567@s.whatsapp.net"),
  ]);
  assert.deepEqual(first, simultaneous);
  assert.equal(queries, 3);
  assert.equal(peak, 3);
  assert.equal(userFindOptions[0].projection.identityAliases, 1);
  assert.equal(userFindOptions[0].projection.registered, 1);
  assert.equal(userFindOptions[0].projection.money, undefined);
  assert.equal(first.accountId, "263771234567@s.whatsapp.net");
  await resolveAccountIdentity(db, "263771234567@s.whatsapp.net");
  assert.equal(queries, 6, "a completed lookup is not cached past its request");
});
