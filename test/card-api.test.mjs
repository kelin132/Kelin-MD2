import test from "node:test";
import assert from "node:assert/strict";
import {
  normalise,
  pickRandomCardFromCatalog,
  TIER_WEIGHTS,
} from "../lib/cardApi.mjs";

test("normalises extensionless animated API media and exposes a short claim ID", () => {
  const card = normalise({
    id: "ab1234",
    tier: "SSR",
    title: "Animated card",
    image: "https://cards.example/api/image?id=ab1234",
    gifUrl: "https://cards.example/api/image?id=ab1234",
    media_type: "gif",
    is_animated: true,
    source_media_type: "video",
  }, 42);

  assert.equal(card.mediaType, "gif");
  assert.equal(card.media, "https://cards.example/api/image?id=ab1234");
  assert.equal(card.claimId, "42");
  assert.equal(card.cardId, "AB1234");
});

test("normalises video-backed cards even when their media URL has no GIF extension", () => {
  const card = normalise({
    id: "short-id",
    tier: "UR",
    title: "Video-backed card",
    image: "https://cards.example/media?id=short-id",
    source_media_type: "video",
  }, 7);

  assert.equal(card.mediaType, "gif");
});

test("weighted spawning can select every catalog tier, including C, R, and X", () => {
  const cards = TIER_WEIGHTS.map(({ num }) => ({ tierNum: num, name: `tier-${num}` }));
  let cumulative = 0;

  for (const { num, weight } of TIER_WEIGHTS) {
    const roll = (cumulative + weight / 2) / TIER_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
    const selected = pickRandomCardFromCatalog(cards, () => roll);
    assert.equal(selected.tierNum, num);
    cumulative += weight;
  }
});

test("falls back to an available card if a selected tier has no cards", () => {
  const cards = [{ tierNum: "X", name: "only-card" }];
  assert.equal(pickRandomCardFromCatalog(cards, () => 0.01), cards[0]);
  assert.equal(pickRandomCardFromCatalog([], () => 0.01), null);
});
