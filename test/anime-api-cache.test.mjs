import test from "node:test";
import assert from "node:assert/strict";
import animePlugin, { clearAnimeCache, resolveAnime } from "../plugins/anime/animeinfo.js";
import {
  clearPublicAnimeCache,
  getAiringAnime,
} from "../lib/davidcyrilAPI.mjs";

const animeResult = {
  data: {
    Media: {
      title: { english: "Naruto", romaji: "Naruto", native: "ナルト" },
      format: "TV",
      status: "FINISHED",
      episodes: 220,
      averageScore: 80,
      genres: ["Action"],
      studios: { nodes: [{ name: "Studio Pierrot" }] },
      startDate: { year: 2002 },
      description: "A ninja story",
      siteUrl: "https://example.test/naruto",
      coverImage: { large: "https://example.test/naruto.jpg" },
    },
  },
};

test("anime category registration and lookups return cached successful details", async () => {
  assert.equal(animePlugin.category, "anime");
  await clearAnimeCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => animeResult };
  };
  try {
    const first = await resolveAnime("Naruto");
    const second = await resolveAnime(" naruto ");
    assert.equal(first.title, "Naruto");
    assert.deepEqual(second, first);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearAnimeCache();
  }
});

test("airing lists share an in-flight request and cache only successful public data", async () => {
  await clearPublicAnimeCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { ok: true, json: async () => ({ success: true, results: [{ title: "New season" }] }) };
  };
  try {
    const [first, second] = await Promise.all([getAiringAnime(), getAiringAnime()]);
    assert.deepEqual(first, second);
    assert.equal(first[0].title, "New season");
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    clearPublicAnimeCache();
  }
});
