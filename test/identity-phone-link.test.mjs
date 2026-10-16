import test from "node:test";
import assert from "node:assert/strict";
import { resolveLid } from "../lib/permissions.mjs";
import {
  migrateLidData,
  mergeRegisteredIdentityDocuments,
  phoneIdentityFields,
  participantMatchesIdentity,
  resolveAndMigrateIdentity,
  resolveJidToLid,
  resolveLidToJid,
  whatsappIdentityVariants,
} from "../lib/identity.mjs";
import { resolveProfileTarget } from "../lib/profileIdentity.mjs";

function fakeDatabase(collections = {}) {
  return {
    collection(name) {
      const docs = collections[name] || (collections[name] = []);
      const getValue = (doc, path) => {
        const [key, ...rest] = path.split(".");
        if (!key) return doc;
        if (Array.isArray(doc)) return doc.flatMap((item) => {
          const value = getValue(item, path);
          return Array.isArray(value) ? value : [value];
        });
        return rest.length ? getValue(doc?.[key], rest.join(".")) : doc?.[key];
      };
      const matchesValue = (actual, expected) => {
        if (expected && typeof expected === "object" && !Array.isArray(expected)) {
          if (Object.hasOwn(expected, "$in")) {
            return expected.$in.some((value) =>
              Array.isArray(actual) ? actual.includes(value) : actual === value
            );
          }
          if (Object.hasOwn(expected, "$regex")) {
            return new RegExp(expected.$regex, expected.$options || "").test(String(actual || ""));
          }
        }
        return actual === expected;
      };
      const matches = (doc, query = {}) =>
        Object.entries(query).every(([key, value]) => {
          if (key === "$or") return value.some((branch) => matches(doc, branch));
          return matchesValue(getValue(doc, key), value);
        });
      const setPath = (doc, path, value) => {
        const parts = path.split(".");
        let current = doc;
        for (const part of parts.slice(0, -1)) {
          current[part] ??= {};
          current = current[part];
        }
        current[parts.at(-1)] = value;
      };
      const applyUpdate = (doc, update) => {
        for (const [key, value] of Object.entries(update.$set || {})) setPath(doc, key, structuredClone(value));
      };
      const cursor = (query) => ({
        async toArray() {
          return docs.filter((item) => matches(item, query)).map((item) => structuredClone(item));
        },
      });

      return {
        async findOne(query) {
          const doc = docs.find((item) => matches(item, query));
          return doc ? structuredClone(doc) : null;
        },
        find: cursor,
        async updateOne(query, update, options = {}) {
          let doc = docs.find((item) => matches(item, query));
          let upsertedId;
          if (!doc && options.upsert) {
            doc = {};
            if (query._id !== undefined && (typeof query._id !== "object" || query._id === null)) {
              doc._id = query._id;
            }
            docs.push(doc);
            upsertedId = doc._id;
          }
          if (!doc) return { matchedCount: 0, acknowledged: true };
          applyUpdate(doc, update);
          return { matchedCount: upsertedId === undefined ? 1 : 0, upsertedId, acknowledged: true };
        },
        async updateMany(query, update) {
          let matchedCount = 0;
          for (const doc of docs) {
            if (!matches(doc, query)) continue;
            applyUpdate(doc, update);
            matchedCount += 1;
          }
          return { matchedCount, modifiedCount: matchedCount, acknowledged: true };
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

test("permission LID resolution returns only verified phone digits", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const mappedSock = {
    signalRepository: {
      lidMapping: {
        async getPNForLID() { return phoneJid; },
      },
    },
  };
  const unmappedSock = {};

  assert.equal(await resolveLid("12345@lid", mappedSock, "group@g.us"), "263771234567");
  assert.equal(await resolveLid("12345@lid", unmappedSock, "group@g.us"), "");
});

test("privacy LID digits are not exposed as phone-number aliases", () => {
  const variants = whatsappIdentityVariants("12345:7@lid");

  assert.deepEqual(phoneIdentityFields("12345@lid"), {});
  assert.ok(variants.includes("12345@lid"));
  assert.ok(!variants.includes("12345"));
  assert.ok(!variants.includes("+12345"));
  assert.ok(!variants.includes("12345@s.whatsapp.net"));
});

test("group participant matching recognizes JID/LID aliases without comparing LID digits as a phone", () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const lid = "12345@lid";

  assert.equal(
    participantMatchesIdentity({ id: lid, lid, phoneNumber: phoneJid }, [phoneJid]),
    true,
  );
  assert.equal(participantMatchesIdentity({ id: phoneJid, lid }, [lid]), true);
  assert.equal(participantMatchesIdentity({ id: lid, lid }, [phoneJid]), false);
});

test("group metadata resolves an LID participant through its verified phoneNumber", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const lid = "12345@lid";
  const sock = {
    async groupMetadata() {
      return { participants: [{ id: lid, lid, phoneNumber: "263771234567" }] };
    },
  };

  assert.equal(await resolveLidToJid(lid, sock, "group@g.us"), phoneJid);
});

test("an LID group message preserves the existing registered account when participant phoneNumber identifies it", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const lid = "12345@lid";
  const db = fakeDatabase({
    users: [{ _id: lid, registered: true, name: "Original account", money: 900, bank: 25 }],
  });
  const sock = {
    async groupMetadata() {
      return { participants: [{ id: lid, lid, phoneNumber: phoneJid }] };
    },
  };

  const resolved = await resolveAndMigrateIdentity(lid, sock, "group@g.us", "", db);
  const account = await db.collection("users").findOne({ _id: phoneJid });

  assert.equal(resolved, phoneJid);
  assert.equal(account.registered, true);
  assert.equal(account.name, "Original account");
  assert.equal(account.money, 900);
  assert.equal(account.bank, 25);
  assert.equal(await db.collection("users").findOne({ _id: lid }), null);
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

test("missing phone-to-LID lookups are cached, then replaced by a verified alternate", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const lid = "12345@lid";
  let mappingLookups = 0;
  let databaseLookups = 0;
  const sock = {
    signalRepository: {
      lidMapping: {
        async getLIDForPN() {
          mappingLookups += 1;
          return null;
        },
      },
    },
  };
  const db = {
    collection() {
      return {
        async findOne() {
          databaseLookups += 1;
          return null;
        },
      };
    },
  };

  assert.equal(await resolveJidToLid(phoneJid, sock, db), "");
  assert.equal(await resolveJidToLid(phoneJid, sock, db), "");
  assert.equal(mappingLookups, 1);
  assert.equal(databaseLookups, 2); // alias collection first, then pre-upgrade user fallback

  await resolveAndMigrateIdentity(phoneJid, sock, "", lid, fakeDatabase());
  assert.equal(await resolveJidToLid(phoneJid, sock, db), lid);
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

test("legacy user documents keyed by an LID field migrate to the canonical phone account", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{
      _id: "legacy-user-document",
      userId: lid,
      registered: true,
      name: "Original account",
      money: 900,
      bank: 25,
    }],
  });

  const resolved = await resolveAndMigrateIdentity(lid, {}, "group@g.us", phoneJid, db);
  const user = await db.collection("users").findOne({ _id: phoneJid });

  assert.equal(resolved, phoneJid);
  assert.equal(user.registered, true);
  assert.equal(user.name, "Original account");
  assert.equal(user.money, 900);
  assert.equal(user.bank, 25);
  assert.equal(user.whatsappNumber, phoneJid);
  assert.equal(user.migratedFrom, lid);
  assert.equal(await db.collection("users").findOne({ _id: "legacy-user-document" }), null);
});

test("verified LID aliases survive reconnects even without a registered user record", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    pokemon_trainers: [{ _id: "trainer-old", jid: lid, username: "Eclipse", party: [] }],
  });

  const resolved = await resolveAndMigrateIdentity(lid, {}, "group@g.us", phoneJid, db);
  const alias = await db.collection("whatsapp_identity_aliases").findOne({ _id: lid });

  assert.equal(resolved, phoneJid);
  assert.equal(alias.jid, phoneJid);
  assert.equal(alias.migrationVersion, 3);
  assert.equal(await resolveJidToLid(phoneJid, {}, db), lid);
  assert.equal((await db.collection("pokemon_trainers").findOne({ jid: phoneJid })).username, "Eclipse");
});

test("a persisted verified alias resolves an LID after reconnect without a live mapping", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    whatsapp_identity_aliases: [{ _id: lid, jid: phoneJid, migrationVersion: 2 }],
  });

  assert.equal(
    await resolveLidToJid(lid, {}, "group@g.us", "", db),
    phoneJid,
  );
});

test("profile lookups resolve a quoted LID to the same canonical user as its phone JID", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    whatsapp_identity_aliases: [{ _id: lid, jid: phoneJid, migrationVersion: 3 }],
  });

  const target = await resolveProfileTarget({
    quotedParticipant: lid,
    sender: "requester@s.whatsapp.net",
    sock: {},
    chatId: "group@g.us",
    database: db,
  });

  assert.equal(target, phoneJid);
});

test("previously migrated accounts reconcile LID records created after the old migration", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    whatsapp_identity_aliases: [{ _id: lid, jid: phoneJid, migrationVersion: 2 }],
    users: [{
      _id: lid,
      registered: true,
      name: "Recovered account",
      money: 900,
      bank: 25,
    }],
  });

  const resolved = await resolveAndMigrateIdentity(lid, {}, "group@g.us", "", db);
  const account = await db.collection("users").findOne({ _id: phoneJid });
  const alias = await db.collection("whatsapp_identity_aliases").findOne({ _id: lid });

  assert.equal(resolved, phoneJid);
  assert.equal(account.registered, true);
  assert.equal(account.name, "Recovered account");
  assert.equal(account.money, 900);
  assert.equal(account.bank, 25);
  assert.equal(await db.collection("users").findOne({ _id: lid }), null);
  assert.equal(alias.migrationVersion, 3);
});

test("concurrent and repeated identity repairs share one successful migration", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const baseDb = fakeDatabase();
  let databaseOperations = 0;
  const db = {
    collection(name) {
      const collection = baseDb.collection(name);
      return new Proxy(collection, {
        get(target, property) {
          const value = target[property];
          if (typeof value !== "function") return value;
          return (...args) => {
            databaseOperations += 1;
            return value.apply(target, args);
          };
        },
      });
    },
  };
  const sock = {};

  const [first, concurrent] = await Promise.all([
    resolveAndMigrateIdentity(lid, sock, "", phoneJid, db),
    resolveAndMigrateIdentity(lid, sock, "", phoneJid, db),
  ]);
  assert.equal(first, phoneJid);
  assert.equal(concurrent, phoneJid);
  const operationsAfterMigration = databaseOperations;
  assert.ok(operationsAfterMigration > 0);

  assert.equal(await resolveAndMigrateIdentity(lid, sock, "", phoneJid, db), phoneJid);
  assert.equal(databaseOperations, operationsAfterMigration);
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

test("verified LID migration reconnects the user's bot data across all owner collections", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{ _id: phoneJid, registered: true, migratedFrom: lid }],
    rpg_users: [{ _id: lid, level: 12, xp: 40 }],
    pokemon_trainers: [{
      _id: "trainer-old",
      jid: lid,
      username: "Eclipse",
      party: ["old-pokemon"],
      pc: ["old-pc-pokemon"],
      inventory: { potion: 3 },
    }],
    pokemon_owned: [{ _id: "pokemon-old", ownerJid: lid, name: "Pikachu" }],
    dbz_players: [{
      _id: "dbz-old",
      jid: lid,
      character: "Goku",
      inventory: ["senzu"],
      techniques: ["kamehameha"],
    }],
    dbz_fighters: [{ _id: "fighter-old", ownerJid: lid, name: "Goku", level: 20 }],
    ptcg_players: [{
      _id: "ptcg-old",
      jid: lid,
      cards: [{ ownedId: "old-owned-card" }],
      cardsPulled: 1,
      packsOpened: 2,
    }],
    pets: [{ _id: "pet-old", owner: lid, petId: "44001", name: "Mochi" }],
    ptcg_market: [{ _id: "listing-old", sellerJid: lid, status: "active" }],
    ptcg_trades: [{ _id: "trade-old", fromJid: lid, toJid: "other@s.whatsapp.net" }],
    mn_card_market: [{ _id: "card-listing-old", sellerId: "12345" }],
    account_links: [{ _id: "discord-link", whatsappId: lid, discordId: "discord-user", status: "active" }],
    companies: [{ _id: "company-old", ownerId: lid, name: "Eclipse shop" }],
    guilds: [{
      _id: "Eclipse guild",
      owner: lid,
      members: [lid, "other@s.whatsapp.net"],
    }],
    guildWars: [{
      _id: "war-old",
      createdBy: lid,
      guildA: { owner: lid },
      matchups: [{ a: { jid: lid, name: "Eclipse" }, reportedBy: lid }],
    }],
    web_battle_rooms: [{
      _id: "battle-old",
      challenger: { id: lid },
      invitedOpponentId: lid,
      spectatorIds: [lid],
    }],
    akira_memory: [{
      _id: lid,
      userJid: lid,
      history: [{ role: "user", text: "hello", ts: 1, chatJid: "group@g.us" }],
      messageCount: 1,
    }],
    workSessions: [{ _id: lid, lastCollectTime: 123 }],
    petpvp_cd: [{ _id: lid, lastPvp: 456 }],
    lottery: [{
      _id: "current",
      tickets: [{ userId: "12345", count: 1 }, { userId: "another-user", count: 1 }],
    }],
    lottery_announcements: [{
      _id: "draw-old",
      payload: {
        mentions: [lid],
        winners: [{ userId: lid, name: "Eclipse" }],
      },
    }],
    warns: [{
      _id: `group@g.us:${lid}`,
      count: 2,
      warnings: [{ by: lid, reason: "legacy", ts: "2026-01-01" }],
    }],
    antilinkWarns: [{ _id: `group@g.us:${lid}`, count: 1 }],
  });

  const resolved = await resolveAndMigrateIdentity(phoneJid, {}, "", "", db);

  assert.equal(resolved, phoneJid);
  assert.equal((await db.collection("pokemon_trainers").findOne({ jid: phoneJid })).username, "Eclipse");
  assert.equal((await db.collection("pokemon_owned").findOne({ _id: "pokemon-old" })).ownerJid, phoneJid);
  assert.equal((await db.collection("dbz_players").findOne({ jid: phoneJid })).character, "Goku");
  assert.equal((await db.collection("dbz_fighters").findOne({ ownerJid: phoneJid })).level, 20);
  assert.equal((await db.collection("ptcg_players").findOne({ jid: phoneJid })).cards[0].ownedId, "old-owned-card");
  assert.equal((await db.collection("pets").findOne({ owner: phoneJid })).name, "Mochi");
  assert.equal((await db.collection("ptcg_market").findOne({ sellerJid: phoneJid })).status, "active");
  assert.equal((await db.collection("ptcg_trades").findOne({ fromJid: phoneJid })).toJid, "other@s.whatsapp.net");
  assert.equal((await db.collection("mn_card_market").findOne({ sellerId: "263771234567" }))._id, "card-listing-old");
  assert.equal((await db.collection("account_links").findOne({ whatsappId: phoneJid })).discordId, "discord-user");
  assert.equal((await db.collection("companies").findOne({ ownerId: phoneJid })).name, "Eclipse shop");
  assert.equal((await db.collection("rpg_users").findOne({ _id: phoneJid })).level, 12);
  assert.deepEqual((await db.collection("guilds").findOne({ _id: "Eclipse guild" })).members, [
    phoneJid,
    "other@s.whatsapp.net",
  ]);
  assert.equal((await db.collection("guilds").findOne({ _id: "Eclipse guild" })).owner, phoneJid);
  const war = await db.collection("guildWars").findOne({ _id: "war-old" });
  assert.equal(war.createdBy, phoneJid);
  assert.equal(war.matchups[0].a.jid, phoneJid);
  assert.equal((await db.collection("web_battle_rooms").findOne({ _id: "battle-old" })).challenger.id, phoneJid);
  assert.equal((await db.collection("akira_memory").findOne({ _id: phoneJid })).history[0].text, "hello");
  assert.equal((await db.collection("workSessions").findOne({ _id: phoneJid })).lastCollectTime, 123);
  assert.equal((await db.collection("petpvp_cd").findOne({ _id: phoneJid })).lastPvp, 456);
  assert.equal((await db.collection("lottery").findOne({ _id: "current" })).tickets[0].userId, "263771234567");
  const archivedDraw = await db.collection("lottery_announcements").findOne({ _id: "draw-old" });
  assert.deepEqual(archivedDraw.payload.mentions, [phoneJid]);
  assert.equal(archivedDraw.payload.winners[0].userId, phoneJid);
  assert.equal((await db.collection("warns").findOne({ _id: `group@g.us:${phoneJid}` })).warnings[0].by, phoneJid);
  assert.equal((await db.collection("antilinkWarns").findOne({ _id: `group@g.us:${phoneJid}` })).count, 1);
});

test("colliding user progress records merge instead of dropping the old LID record", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    pokemon_trainers: [
      { _id: "old-trainer", jid: lid, username: "Eclipse", party: ["old"], pc: ["old-pc"] },
      { _id: "phone-trainer", jid: phoneJid, username: "New profile", party: ["new"], pc: [] },
    ],
    ptcg_players: [
      { _id: "old-player", jid: lid, cards: [{ ownedId: "old-card" }], packsOpened: 2 },
      { _id: "phone-player", jid: phoneJid, cards: [{ ownedId: "phone-card" }], packsOpened: 3 },
    ],
    petpvp_cd: [
      { _id: lid, lastPvp: 100 },
      { _id: phoneJid, lastPvp: 200 },
    ],
  });

  assert.equal(await migrateLidData(lid, phoneJid, db), true);
  const trainer = await db.collection("pokemon_trainers").findOne({ jid: phoneJid });
  const player = await db.collection("ptcg_players").findOne({ jid: phoneJid });

  assert.deepEqual(trainer.party, ["old", "new"]);
  assert.deepEqual(trainer.pc, ["old-pc"]);
  assert.equal(trainer.username, "Eclipse");
  assert.equal(trainer.identityMigrationConflicts[lid].username, "New profile");
  assert.deepEqual(player.cards.map((card) => card.ownedId), ["old-card", "phone-card"]);
  assert.equal(player.packsOpened, 5);
  assert.equal((await db.collection("petpvp_cd").findOne({ _id: phoneJid })).lastPvp, 200);
  assert.equal(await db.collection("pokemon_trainers").findOne({ _id: "old-trainer" }), null);
  assert.equal(await db.collection("ptcg_players").findOne({ _id: "old-player" }), null);
  assert.equal(await db.collection("petpvp_cd").findOne({ _id: lid }), null);
});
