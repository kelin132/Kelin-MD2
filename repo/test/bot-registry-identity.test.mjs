import test from "node:test";
import assert from "node:assert/strict";
import { botRegistryId, normalizeBotIdentity } from "../lib/botRegistry.mjs";

test("bot registry preserves LIDs as canonical bot IDs", () => {
  assert.equal(normalizeBotIdentity("12345:4@lid"), "12345@lid");
  assert.equal(botRegistryId("12345:4@lid"), "bot:12345@lid");
  assert.equal(botRegistryId("bot:12345@lid"), "bot:12345@lid");
});

test("phone JIDs still normalize to the legacy numeric bot ID", () => {
  assert.equal(normalizeBotIdentity("263771234567:3@s.whatsapp.net"), "263771234567");
  assert.equal(botRegistryId("263771234567@s.whatsapp.net"), "bot:263771234567");
});
