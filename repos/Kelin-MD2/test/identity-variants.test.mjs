import test from "node:test";
import assert from "node:assert/strict";
import {
  phoneIdentityFields,
  whatsappIdentityVariants,
} from "../lib/identity.mjs";

test("phone identity variants cover legacy WhatsApp spellings", () => {
  const variants = whatsappIdentityVariants("263771234567@s.whatsapp.net");

  assert.ok(variants.includes("263771234567"));
  assert.ok(variants.includes("+263771234567"));
  assert.ok(variants.includes("263771234567@s.whatsapp.net"));
  assert.ok(variants.includes("263771234567@c.us"));
  assert.ok(variants.includes("263771234567:0@s.whatsapp.net"));
});

test("canonical phone records expose website lookup aliases", () => {
  assert.deepEqual(phoneIdentityFields("263771234567:4@s.whatsapp.net"), {
    phoneNumber: "263771234567",
    whatsappNumber: "263771234567@s.whatsapp.net",
    jid: "263771234567@s.whatsapp.net",
    userId: "263771234567@s.whatsapp.net",
  });
  assert.deepEqual(phoneIdentityFields("12345@lid"), {});
});