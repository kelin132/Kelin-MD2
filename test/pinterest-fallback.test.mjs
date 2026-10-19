import test from "node:test";
import assert from "node:assert/strict";
import { searchPinterestImages } from "../plugins/download/pin.js";

test("Pinterest stops after the first provider returns usable image results", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const pathname = new URL(String(input)).pathname;
    calls.push(pathname);
    const payload = pathname.endsWith("/googleimage")
      ? { results: [] }
      : { results: [{ image: { url: "https://images.example/pin.jpg" } }] };
    return { ok: true, status: 200, json: async () => payload };
  };
  try {
    const results = await searchPinterestImages("anime wallpaper");
    assert.deepEqual(results, ["https://images.example/pin.jpg"]);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].endsWith("/googleimage"));
    assert.ok(calls[1].endsWith("/pinterest"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
