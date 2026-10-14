import test from "node:test";
import assert from "node:assert/strict";
import {
  clearAfkLookupCache,
  invalidateAfkLookup,
  readAfkLookup,
  writeAfkLookup,
} from "../lib/afkLookupCache.mjs";

test("caches negative AFK lookups and expires them", () => {
  clearAfkLookupCache();
  writeAfkLookup("user@s.whatsapp.net", null, 1_000);

  assert.deepEqual(readAfkLookup("user@s.whatsapp.net", 5_000), { hit: true, value: null });
  assert.equal(readAfkLookup("user@s.whatsapp.net", 11_001).hit, false);
});

test("AFK lookups can be invalidated after an account update", () => {
  clearAfkLookupCache();
  writeAfkLookup("user@s.whatsapp.net", null, 1_000);
  invalidateAfkLookup("user@s.whatsapp.net");

  assert.equal(readAfkLookup("user@s.whatsapp.net", 2_000).hit, false);
});
