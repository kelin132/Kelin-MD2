import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchRandomCard,
  clearCache,
  getCardMediaKind,
  normalise,
  pickRandomCardFromCatalog,
  pickRandomTier,
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
    thumbnailUrl: "https://cards.example/thumb.jpg",
  }, 42);

  assert.equal(card.mediaType, "gif");
  assert.equal(card.media, "https://cards.example/api/image?id=ab1234");
  assert.equal(card.claimId, "42");
  assert.equal(card.cardId, "AB1234");
  assert.equal(card.thumbnail, "https://cards.example/thumb.jpg");
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

test("uses the API's stable coin value for classic card tiers", () => {
  const card = normalise({
    id: "common-1",
    tier: "1",
    title: "Common card",
    value: 5750,
    value_currency: "coins",
  }, 12);

  assert.equal(card.price, 5750);
});

test("fetches one tiered card and keeps its API ID claimable", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestCount = 0;
  globalThis.fetch = async (url) => {
    requestUrl = String(url);
    requestCount += 1;
    const isEventDraw = requestCount === 1;
    return new Response(JSON.stringify({
      success: true,
      id: "5c7c49",
      name: "Pain",
      title: "Pain",
      series: "Naruto",
      tier: "UR",
      image: "https://eula-cardapi.suhotech.xyz/api/image?id=5c7c49",
      media_type: "gif",
      is_animated: true,
      value: 16599106,
      value_currency: "coins",
      event: isEventDraw ? "Halloween" : null,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const card = await fetchRandomCard("Tier UR");
    assert.equal(requestUrl, "https://eula-cardapi.suhotech.xyz/api/random?tier=UR");
    assert.equal(requestCount, 2);
    assert.equal(card.claimId, "5c7c49");
    assert.equal(card.cardId, "5C7C49");
    assert.equal(card.price, 16599106);
    assert.equal(card.mediaType, "gif");
    assert.equal(pickRandomTier(() => 0), TIER_WEIGHTS[0].num);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls back to the filtered catalog when random draws keep returning event cards", async () => {
  const originalFetch = globalThis.fetch;
  let randomRequests = 0;
  let catalogRequests = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/api/random?")) {
      randomRequests += 1;
      return new Response(JSON.stringify({
        success: true,
        id: `event-${randomRequests}`,
        name: "Seasonal event card",
        tier: "1",
        event: "Halloween",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    catalogRequests += 1;
    return new Response(JSON.stringify([
      {
        id: "normal-card",
        title: "Normal card",
        tier: "1",
        series: "Test Series",
        image: "https://cards.example/normal.jpg",
        value: 2500,
        value_currency: "coins",
        event: null,
      },
      {
        id: "event-card",
        title: "Event card",
        tier: "1",
        series: "Test Series",
        image: "https://cards.example/event.jpg",
        event: "Halloween",
      },
    ]), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const card = await fetchRandomCard("Common");
    assert.equal(randomRequests, 4);
    assert.equal(catalogRequests, 1);
    assert.equal(card.name, "Normal card");
    assert.equal(card.cardId, "NORMAL-CARD");
  } finally {
    clearCache();
    globalThis.fetch = originalFetch;
  }
});


test("large X-tier still cards use the compact-image delivery path", () => {
  const card = normalise({ tier: "X", title: "Large X image", image: "https://cards.example/full-resolution.jpg" }, 99);
  assert.equal(card.mediaType, "image");
  assert.equal(getCardMediaKind(card), "image");
});

test("animated X-tier cards use the looping-video delivery path", () => {
  const card = normalise({ tier: "X", title: "Animated X", image: "https://cards.example/media?id=x", media_type: "gif" }, 100);
  assert.equal(getCardMediaKind(card), "animated");
});

test("Secret cards with extensionless image proxy URLs use the animated delivery path", () => {
  const card = normalise({
    tier: "S",
    title: "Secret card",
    image: "https://api.shoob.gg/site/api/cardr/example?size=700",
    media_type: "image",
    source_media_type: "image",
    is_animated: false,
  }, 101);

  assert.equal(card.mediaType, "gif");
  assert.equal(getCardMediaKind(card), "animated");
  assert.equal(getCardMediaKind({
    tierNum: "S",
    mediaType: "image",
    media: "https://api.shoob.gg/site/api/cardr/legacy?size=700",
  }), "animated");
});
