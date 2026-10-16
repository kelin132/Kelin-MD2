import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeRegisteredIdentityDocuments,
  phoneIdentityFields,
  resolveJidToLid,
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

test("phone JIDs can resolve the original LID through Baileys' reverse mapping", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const sock = {
    signalRepository: {
      lidMapping: {
        async getLIDForPN(jid) {
          assert.equal(jid, phoneJid);
          return "12345:4@lid";
        },
      },
    },
  };

  assert.equal(await resolveJidToLid(phoneJid, sock), "12345@lid");
});

test("legacy registered-account values remain primary when phone-keyed records collide", () => {
  const migratedAt = new Date("2026-10-16T00:00:00.000Z");
  const merged = mergeRegisteredIdentityDocuments(
    {
      _id: "12345@lid",
      registered: true,
      name: "Original account",
      money: 900,
      websiteId: "AID-0123456789",
    },
    {
      _id: "263771234567@s.whatsapp.net",
      registered: true,
      name: "New duplicate",
      money: 0,
      phoneNumber: "263771234567",
      profilePictureUrl: "https://example.com/avatar.png",
    },
    "12345@lid",
    "263771234567@s.whatsapp.net",
    migratedAt,
  );

  assert.equal(merged._id, "263771234567@s.whatsapp.net");
  assert.equal(merged.name, "Original account");
  assert.equal(merged.money, 900);
  assert.equal(merged.websiteId, "AID-0123456789");
  assert.equal(merged.profilePictureUrl, "https://example.com/avatar.png");
  assert.deepEqual(merged.identityMigrationConflicts["12345@lid"], {
    name: "New duplicate",
    money: 0,
  });
});
