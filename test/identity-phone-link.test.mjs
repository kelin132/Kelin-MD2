import test from "node:test";
import assert from "node:assert/strict";
import {
  phoneIdentityFields,
  resolveLidToJid,
  whatsappIdentityVariants,
} from "../lib/identity.mjs";

test("privacy LID digits are not exposed as phone-number aliases", () => {
  const variants = whatsappIdentityVariants("12345:7@lid");

  assert.deepEqual(phoneIdentityFields("12345@lid"), {});
  assert.ok(variants.includes("12345@lid"));
  assert.ok(!variants.includes("12345"));
  assert.ok(!variants.includes("+12345"));
  assert.ok(!variants.includes("12345@s.whatsapp.net"));
});

test("LID resolution uses Baileys phone mapping and strips device suffixes", async () => {
  const sock = {
    signalRepository: {
      lidMapping: {
        async getPNForLID(lid) {
          assert.equal(lid, "12345@lid");
          return "263771234567:4@s.whatsapp.net";
        },
      },
    },
  };

  assert.equal(
    await resolveLidToJid("12345:7@lid", sock),
    "263771234567@s.whatsapp.net",
  );
});

test("unmapped LID digits and non-phone alternate JIDs are never treated as a phone", async () => {
  const sock = {
    signalRepository: {
      lidMapping: {
        async getPNForLID() {
          return null;
        },
      },
    },
    async groupMetadata() {
      return { participants: [] };
    },
  };

  assert.equal(
    await resolveLidToJid("12345@lid", sock, "group@g.us", "group@g.us"),
    "12345@lid",
  );
});

test("a non-phone value returned by a mapping cannot become the account identity", async () => {
  const sock = {
    signalRepository: {
      lidMapping: {
        async getPNForLID() {
          return "group@g.us";
        },
      },
    },
  };

  assert.equal(await resolveLidToJid("12345@lid", sock), "12345@lid");
});
