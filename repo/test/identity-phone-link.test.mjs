import test from "node:test";
import assert from "node:assert/strict";
import {
  getDatabaseId,
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
        async updateOne(query, update) {
          const doc = docs.find((item) => matches(item, query));
          if (!doc) return { matchedCount: 0 };
          applyUpdate(doc, update);
          return { matchedCount: 1 };
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
  assert.equal(await getDatabaseId(phoneJid, sock), "12345@lid");
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

test("phone-message identity recovery restores user and card data under the persisted LID", async () => {
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{
      _id: phoneJid,
      registered: true,
      migratedFrom: "12345@lid",
    }],
    mn_users: [{
      _id: "old-card-user",
      userId: "263771234567",
      whatsappNumber: phoneJid,
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
  const cardUser = await db.collection("mn_users").findOne({ userId: "12345" });

  assert.equal(resolved, "12345@lid");
  assert.deepEqual(cardUser.cards, [{ cardId: "legacy-card" }]);
  assert.equal(cardUser.whatsappNumber, "12345@lid");
  assert.equal(await db.collection("mn_users").findOne({ userId: "263771234567" }), null);
});

test("LID placeholder does not replace an existing registered phone account", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [
      { _id: lid, registered: false, phoneNumber: "263771234567" },
      { _id: phoneJid, registered: true, name: "Eclipse", money: 900, migratedFrom: lid },
    ],
  });

  assert.equal(await migrateLidData(lid, phoneJid, db), true);
  const restored = await db.collection("users").findOne({ _id: lid });
  assert.equal(restored.registered, true);
  assert.equal(restored.name, "Eclipse");
  assert.equal(restored.money, 900);
  assert.equal(restored.phoneNumber, "263771234567");
  assert.equal(await db.collection("users").findOne({ _id: phoneJid }), null);
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

test("LID restoration rekeys phone card users and merges them into the existing LID record", async () => {
  const db = fakeDatabase({
    mn_users: [
      {
        _id: "phone-card-user",
        userId: "263771234567",
        whatsappNumber: "263771234567@s.whatsapp.net",
        balance: 0,
        cards: [{ cardId: "phone-card", name: "New card" }],
        totalCards: 1,
        username: null,
      },
      {
        _id: "old-card-user",
        userId: "12345",
        whatsappNumber: "12345@lid",
        balance: 250,
        cards: [{ cardId: "old-card", name: "Legacy card" }],
        totalCards: 1,
        username: "Eclipse",
      },
    ],
  });

  const migrated = await migrateLidData(
    "12345@lid",
    "263771234567@s.whatsapp.net",
    db,
  );
  const users = db.collection("mn_users");
  const lidUser = await users.findOne({ userId: "12345" });
  const phoneUser = await users.findOne({ userId: "263771234567" });

  assert.equal(migrated, true);
  assert.equal(phoneUser, null);
  assert.equal(lidUser._id, "old-card-user");
  assert.deepEqual(lidUser.cards.map((card) => card.cardId), ["phone-card", "old-card"]);
  assert.equal(lidUser.totalCards, 2);
  assert.equal(lidUser.balance, 250);
  assert.equal(lidUser.username, "Eclipse");
  assert.deepEqual(lidUser.identityMigrationConflicts["263771234567@s.whatsapp.net"], {
    balance: 0,
  });
});

test("LID restoration rekeys a phone card user when there is no LID-keyed record yet", async () => {
  const db = fakeDatabase({
    mn_users: [{
      _id: "old-card-user",
      userId: "263771234567",
      whatsappNumber: "263771234567@s.whatsapp.net",
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
    .findOne({ userId: "12345" });

  assert.equal(migrated, true);
  assert.equal(cardUser._id, "old-card-user");
  assert.equal(cardUser.whatsappNumber, "12345@lid");
  assert.deepEqual(cardUser.cards, [{ cardId: "old-card" }]);
});

test("verified LID migration reconnects the user's bot data across all owner collections", async () => {
  const lid = "12345@lid";
  const phoneJid = "263771234567@s.whatsapp.net";
  const db = fakeDatabase({
    users: [{ _id: phoneJid, registered: true, migratedFrom: lid }],
    rpg_users: [{ _id: phoneJid, level: 12, xp: 40 }],
    pokemon_trainers: [{
      _id: "trainer-old",
      jid: phoneJid,
      username: "Eclipse",
      party: ["old-pokemon"],
      pc: ["old-pc-pokemon"],
      inventory: { potion: 3 },
    }],
    pokemon_owned: [{ _id: "pokemon-old", ownerJid: phoneJid, name: "Pikachu" }],
    dbz_players: [{
      _id: "dbz-old",
      jid: phoneJid,
      character: "Goku",
      inventory: ["senzu"],
      techniques: ["kamehameha"],
    }],
    dbz_fighters: [{ _id: "fighter-old", ownerJid: phoneJid, name: "Goku", level: 20 }],
    ptcg_players: [{
      _id: "ptcg-old",
      jid: phoneJid,
      cards: [{ ownedId: "old-owned-card" }],
      cardsPulled: 1,
      packsOpened: 2,
    }],
    pets: [{ _id: "pet-old", owner: phoneJid, petId: "44001", name: "Mochi" }],
    ptcg_market: [{ _id: "listing-old", sellerJid: phoneJid, status: "active" }],
    ptcg_trades: [{ _id: "trade-old", fromJid: phoneJid, toJid: "other@s.whatsapp.net" }],
    mn_card_market: [{ _id: "card-listing-old", sellerId: "263771234567" }],
    account_links: [{ _id: "discord-link", whatsappId: phoneJid, discordId: "discord-user", status: "active" }],
    companies: [{ _id: "company-old", ownerId: phoneJid, name: "Eclipse shop" }],
    guilds: [{
      _id: "Eclipse guild",
      owner: phoneJid,
      members: [phoneJid, "other@s.whatsapp.net"],
    }],
    guildWars: [{
      _id: "war-old",
      createdBy: phoneJid,
      guildA: { owner: phoneJid },
      matchups: [{ a: { jid: phoneJid, name: "Eclipse" }, reportedBy: phoneJid }],
    }],
    web_battle_rooms: [{
      _id: "battle-old",
      challenger: { id: phoneJid },
      invitedOpponentId: phoneJid,
      spectatorIds: [phoneJid],
    }],
    akira_memory: [{
      _id: phoneJid,
      userJid: phoneJid,
      history: [{ role: "user", text: "hello", ts: 1, chatJid: "group@g.us" }],
      messageCount: 1,
    }],
    workSessions: [{ _id: phoneJid, lastCollectTime: 123 }],
    petpvp_cd: [{ _id: phoneJid, lastPvp: 456 }],
    lottery: [{
      _id: "current",
      tickets: [{ userId: "263771234567", count: 1 }, { userId: "another-user", count: 1 }],
    }],
    lottery_announcements: [{
      _id: "draw-old",
      payload: {
        mentions: [phoneJid],
        winners: [{ userId: phoneJid, name: "Eclipse" }],
      },
    }],
    warns: [{
      _id: `group@g.us:${phoneJid}`,
      count: 2,
      warnings: [{ by: phoneJid, reason: "legacy", ts: "2026-01-01" }],
    }],
    antilinkWarns: [{ _id: `group@g.us:${phoneJid}`, count: 1 }],
  });

  const resolved = await resolveAndMigrateIdentity(phoneJid, {}, "", "", db);

  assert.equal(resolved, lid);
  assert.equal((await db.collection("pokemon_trainers").findOne({ jid: lid })).username, "Eclipse");
  assert.equal((await db.collection("pokemon_owned").findOne({ _id: "pokemon-old" })).ownerJid, lid);
  assert.equal((await db.collection("dbz_players").findOne({ jid: lid })).character, "Goku");
  assert.equal((await db.collection("dbz_fighters").findOne({ ownerJid: lid })).level, 20);
  assert.equal((await db.collection("ptcg_players").findOne({ jid: lid })).cards[0].ownedId, "old-owned-card");
  assert.equal((await db.collection("pets").findOne({ owner: lid })).name, "Mochi");
  assert.equal((await db.collection("ptcg_market").findOne({ sellerJid: lid })).status, "active");
  assert.equal((await db.collection("ptcg_trades").findOne({ fromJid: lid })).toJid, "other@s.whatsapp.net");
  assert.equal((await db.collection("mn_card_market").findOne({ sellerId: "12345" }))._id, "card-listing-old");
  assert.equal((await db.collection("account_links").findOne({ whatsappId: lid })).discordId, "discord-user");
  assert.equal((await db.collection("companies").findOne({ ownerId: lid })).name, "Eclipse shop");
  assert.equal((await db.collection("rpg_users").findOne({ _id: lid })).level, 12);
  assert.deepEqual((await db.collection("guilds").findOne({ _id: "Eclipse guild" })).members, [
    lid,
    "other@s.whatsapp.net",
  ]);
  assert.equal((await db.collection("guilds").findOne({ _id: "Eclipse guild" })).owner, lid);
  const war = await db.collection("guildWars").findOne({ _id: "war-old" });
  assert.equal(war.createdBy, lid);
  assert.equal(war.matchups[0].a.jid, lid);
  assert.equal((await db.collection("web_battle_rooms").findOne({ _id: "battle-old" })).challenger.id, lid);
  assert.equal((await db.collection("akira_memory").findOne({ _id: lid })).history[0].text, "hello");
  assert.equal((await db.collection("workSessions").findOne({ _id: lid })).lastCollectTime, 123);
  assert.equal((await db.collection("petpvp_cd").findOne({ _id: lid })).lastPvp, 456);
  assert.equal((await db.collection("lottery").findOne({ _id: "current" })).tickets[0].userId, "12345");
  const archivedDraw = await db.collection("lottery_announcements").findOne({ _id: "draw-old" });
  assert.deepEqual(archivedDraw.payload.mentions, [lid]);
  assert.equal(archivedDraw.payload.winners[0].userId, lid);
  assert.equal((await db.collection("warns").findOne({ _id: `group@g.us:${lid}` })).warnings[0].by, lid);
  assert.equal((await db.collection("antilinkWarns").findOne({ _id: `group@g.us:${lid}` })).count, 1);
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
  const trainer = await db.collection("pokemon_trainers").findOne({ jid: lid });
  const player = await db.collection("ptcg_players").findOne({ jid: lid });

  assert.deepEqual(trainer.party, ["old", "new"]);
  assert.deepEqual(trainer.pc, ["old-pc"]);
  assert.equal(trainer.username, "Eclipse");
  assert.equal(trainer.identityMigrationConflicts[phoneJid].username, "New profile");
  assert.deepEqual(player.cards.map((card) => card.ownedId), ["old-card", "phone-card"]);
  assert.equal(player.packsOpened, 5);
  assert.equal((await db.collection("petpvp_cd").findOne({ _id: lid })).lastPvp, 200);
  assert.equal(await db.collection("pokemon_trainers").findOne({ _id: "phone-trainer" }), null);
  assert.equal(await db.collection("ptcg_players").findOne({ _id: "phone-player" }), null);
  assert.equal(await db.collection("petpvp_cd").findOne({ _id: phoneJid }), null);
});
