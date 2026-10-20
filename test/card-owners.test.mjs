import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCardOwnersPipeline,
  collapseCardOwners,
  isMentionableOwner,
  ownerJid,
} from "../lib/cardOwners.mjs";

test("owner query searches every stored card and includes legacy ID/name-tier records", () => {
  const pipeline = buildCardOwnersPipeline({
    cardId: "card-abc",
    name: "Legacy Character",
    tierNum: "4",
    tier: "Epic",
  });
  const match = pipeline[0].$match.$or;
  assert.ok(match.some((entry) => entry["cards.cardId"]));
  assert.ok(match.some((entry) => entry["cards.cardID"]));
  assert.ok(match.some((entry) => entry.cards?.$elemMatch?.cardId?.$in?.includes(null)));
  assert.equal(pipeline.some((stage) => stage.$limit), false);
  assert.equal(pipeline.some((stage) => JSON.stringify(stage).includes("obtainedAt")), false);
});

test("all owners remain visible while duplicate aliases of one copy do not inflate counts", () => {
  const owners = collapseCardOwners([
    {
      userId: "263771111111@s.whatsapp.net",
      username: "Older owner",
      count: 2,
      matchingCards: [
        { cardId: "card-abc", spawnId: "spawn-old" },
        { cardId: "card-abc", spawnId: "spawn-second" },
      ],
    },
    {
      whatsappNumber: "263771111111@s.whatsapp.net",
      matchingCards: [{ cardId: "card-abc", spawnId: "spawn-old" }],
      count: 1,
    },
    {
      _id: "263772222222@lid",
      name: "Recent owner",
      matchingCards: [{ id: "card-abc" }],
      count: 1,
    },
    {
      userId: "discord:12345",
      username: "Discord owner",
      matchingCards: [{ cardId: "card-abc" }],
      count: 1,
    },
  ]);

  assert.equal(owners.length, 3);
  assert.equal(owners.find((owner) => owner.jid === "263771111111@s.whatsapp.net").count, 2);
  assert.equal(owners.find((owner) => owner.jid === "263772222222@lid").label, "Recent owner");
  assert.equal(owners.some((owner) => owner.jid === "discord:12345"), true);
  assert.equal(isMentionableOwner("discord:12345"), false);
  assert.equal(isMentionableOwner("263772222222@lid"), true);
  assert.equal(ownerJid({ userId: "263773333333@lid" }), "263773333333@lid");
  assert.equal(ownerJid({ _id: "507f1f77bcf86cd799439011" }), "");
});
