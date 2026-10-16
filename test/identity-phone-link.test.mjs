import test from "node:test";
import assert from "node:assert/strict";
import {
  migrateLidData,
  mergeRegisteredIdentityDocuments,
  phoneIdentityFields,
  resolveAndMigrateIdentity,
  resolveJidToLid,
  resolveLidToJid,
  whatsappIdentityVariants,
} from "../lib/identity.mjs";

function fakeDatabase(collections = {}) {
  return {
    collection(name) {
      const docs = collections[name] || (collections[name] = []);
      const matches = (doc, query) =>
        Object.entries(query).every(([key, value]) => doc?.[key] === value);

      return {
        async findOne(query) {
          const doc = docs.find((item) => matches(item, query));
          return doc ? structuredClone(doc) : null;
        },
        async updateOne(query, update) {
          const doc = docs.find((item) => matches(item, query));
          if (!doc) return { matchedCount: 0 };
          Object.assign(doc, update.$set || {});
          return { matchedCount: 1 };
        },
        async insertOne(doc) {
          docs.push(structuredClone(doc));
          return { insertedId: doc._id };
        },
        async replaceOne(query, replacement) {
          const index = docs.findIndex((item) => matches(item, query));
          if (index < 0) return { matchedCount: 0 };
          docs[index] = structuredClone(replacement);
          return { matchedCount: 1 };
        },
        async deleteOne(query) {
          const index = docs.findIndex((item) => matches(item, query));
          if (index < 0) return { deletedCount: 0 };
          docs.splice(index, 1);
          return { deletedCount: 1 };
        },
      };
    },
  };
}

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

test("phone JIDs recover the original LID from a prior migration record", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{
      _id: phoneJid,
      migratedFrom: "12345@lid",
    }],
  });
  const sock = {
    signalRepository: {
      lidMapping: {
        async getLIDForPN() {
          return null;
        },
      },
    },
  };

  assert.equal(await resolveJidToLid(phoneJid, sock, db), "12345@lid");
});

test("phone-message identity recovery migrates old card data using the persisted LID", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{
      _id: phoneJid,
      registered: true,
      migratedFrom: "12345@lid",
    }],
    mn_users: [{
      _id: "old-card-user",
      userId: "12345",
      whatsappNumber: "12345@lid",
      cards: [{ cardId: "legacy-card" }],
      totalCards: 1,
    }],
  });
  const sock = {
    signalRepository: {
      lidMapping: {
        async getLIDForPN() {
          return null;
        },
      },
    },
  };

  const resolved = await resolveAndMigrateIdentity(phoneJid, sock, "", "", db);
  const cardUser = await db.collection("mn_users")
    .findOne({ userId: "263771234567" });

  assert.equal(resolved, phoneJid);
  assert.deepEqual(cardUser.cards, [{ cardId: "legacy-card" }]);
  assert.equal(await db.collection("mn_users").findOne({ userId: "12345" }), null);
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

test("LID migration rekeys old card users and merges cards into an existing phone record", async () => {
  const db = fakeDatabase({
    mn_users: [
      {
        _id: "old-card-user",
        userId: "12345",
        whatsappNumber: "12345@lid",
        balance: 250,
        cards: [{ cardId: "old-card", name: "Legacy card" }],
        totalCards: 1,
        username: "Eclipse",
      },
      {
        _id: "phone-card-user",
        userId: "263771234567",
        whatsappNumber: "263771234567@s.whatsapp.net",
        balance: 0,
        cards: [{ cardId: "phone-card", name: "New card" }],
        totalCards: 1,
        username: null,
      },
    ],
  });

  const migrated = await migrateLidData(
    "12345@lid",
    "263771234567@s.whatsapp.net",
    db,
  );
  const users = db.collection("mn_users");
  const phoneUser = await users.findOne({ userId: "263771234567" });
  const oldUser = await users.findOne({ userId: "12345" });

  assert.equal(migrated, true);
  assert.equal(oldUser, null);
  assert.equal(phoneUser._id, "phone-card-user");
  assert.deepEqual(phoneUser.cards.map((card) => card.cardId), ["old-card", "phone-card"]);
  assert.equal(phoneUser.totalCards, 2);
  assert.equal(phoneUser.balance, 250);
  assert.equal(phoneUser.username, "Eclipse");
  assert.deepEqual(phoneUser.identityMigrationConflicts["12345@lid"], {
    balance: 0,
  });
});

test("LID migration rekeys card users when there is no phone-keyed record yet", async () => {
  const db = fakeDatabase({
    mn_users: [{
      _id: "old-card-user",
      userId: "12345",
      whatsappNumber: "12345@lid",
      cards: [{ cardId: "old-card" }],
      totalCards: 1,
    }],
  });

  const migrated = await migrateLidData(
    "12345@lid",
    "263771234567@s.whatsapp.net",
    db,
  );
  const cardUser = await db.collection("mn_users")
    .findOne({ userId: "263771234567" });

  assert.equal(migrated, true);
  assert.equal(cardUser._id, "old-card-user");
  assert.equal(cardUser.whatsappNumber, "263771234567@s.whatsapp.net");
  assert.deepEqual(cardUser.cards, [{ cardId: "old-card" }]);
});
