import test from "node:test";
import assert from "node:assert/strict";
import {
  discordAccountKey,
  identityInsertFields,
  identityQuery,
  normalizePlatformId,
} from "../lib/identity.mjs";

test("normalizes Discord IDs into a collision-safe shared key", () => {
  assert.equal(normalizePlatformId(" 1234567890 "), "1234567890");
  assert.equal(discordAccountKey("1234567890"), "discord:1234567890");
});

test("queries both migrated and namespaced Discord identities", () => {
  assert.deepEqual(identityQuery("123", true), {
    $or: [{ discordId: "123" }, { _id: "discord:123" }],
  });
});

test("keeps WhatsApp identity fields unchanged", () => {
  assert.deepEqual(identityInsertFields("123@s.whatsapp.net"), {
    _id: "123@s.whatsapp.net",
  });
});

test("creates Discord identity fields without overwriting MongoDB metadata", () => {
  assert.deepEqual(identityInsertFields("123", true), {
    _id: "discord:123",
    discordId: "123",
  });
});
