import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { getCardClaimId, matchesCardClaimId } from "../lib/cardClaimId.mjs";

globalThis.activeSpawns = {};
let profile;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/plugins/cards/db.js")) return { format: "module", shortCircuit: true,
      source: "export const findOrCreateUser = async () => globalThis.claimProfile;" };
    if (url.endsWith("/lib/cardApi.mjs")) return { format: "module", shortCircuit: true,
      source: "export const sendCardMedia = async () => { throw Error('No fixture media'); };" };
    return nextLoad(url, context);
  },
});
const { default: claim } = await import("../plugins/cards/claim.js");
beforeEach(() => {
  for (const key of Object.keys(globalThis.activeSpawns)) delete globalThis.activeSpawns[key];
  profile = { cards: [], pendingCards: [], totalCards: 0, save: async () => {} };
  globalThis.claimProfile = profile;
});
const card = { name: "A character with a very long original ID", tier: "Rare", tierNum: "3", cardId: "VERY_LONG_EXTERNAL_API_IDENTIFIER", claimId: "VERY_LONG_LEGACY_CLAIM_ID", index: 42 };
const invoke = async input => {
  const replies = [];
  await claim.run({
    sender: "263771234567@s.whatsapp.net", msg: { key: { remoteJid: "fixture@g.us" } },
    args: [input], sock: { sendMessage: async (_, payload) => { replies.push(payload); } },
  });
  return replies;
};

test("claim codes stay short and stable across API IDs, indexes, and tier names", () => {
  const code = getCardClaimId(card);
  assert.match(code, /^[A-Z0-9]{8}$/);
  assert.equal(code, getCardClaimId({ ...card, tierNum: "Rare", index: 99, cardId: "changed-api-id", claimId: "changed" }));
  assert.notEqual(code, getCardClaimId({ ...card, tierNum: "4" }));
  assert.ok(matchesCardClaimId(card, code.toLowerCase()));
  assert.ok(matchesCardClaimId(card, card.cardId));
  assert.ok(matchesCardClaimId(card, card.claimId));
  assert.ok(matchesCardClaimId(card, "42"));
  assert.ok(!matchesCardClaimId(card, ""));
});

test("catalog-size fixtures do not share short codes across tiers or names", () => {
  const codes = Array.from({ length: 20000 }, (_, i) =>
    getCardClaimId({ name: `Character ${i}`, tierNum: String(i % 7 + 1), index: 1 }));
  assert.equal(new Set(codes).size, codes.length);
});

test("pending cards accept short codes without changing persistent card IDs", async () => {
  profile.pendingCards.push({ ...card, spawnId: "personal-1" });
  await invoke(getCardClaimId(card));
  assert.equal(profile.cards.length, 1);
  assert.equal(profile.pendingCards.length, 0);
  assert.equal(profile.cards[0].cardId, card.cardId);
  assert.equal(profile.cards[0].claimId, getCardClaimId(card));
  await invoke(getCardClaimId(card));
  assert.equal(profile.cards.length, 1);
});

test("old pending claim IDs still work", async () => {
  profile.pendingCards.push({ ...card, spawnId: "personal-2" });
  await invoke(card.claimId);
  assert.equal(profile.cards.length, 1);
});

test("claiming one legacy copy does not discard another copy without a spawn ID", async () => {
  profile.pendingCards.push({ ...card }, { ...card });
  await invoke(getCardClaimId(card));
  assert.equal(profile.cards.length, 1);
  assert.equal(profile.pendingCards.length, 1);
});

test("chat spawns accept the displayed short code and cannot be claimed twice", async () => {
  globalThis.activeSpawns["fixture@g.us"] = { card, cardId: card.cardId, spawnId: "chat-1" };
  await invoke(getCardClaimId(card));
  await invoke(getCardClaimId(card));
  assert.equal(profile.cards.length, 1);
  assert.equal(globalThis.activeSpawns["fixture@g.us"], undefined);
});
