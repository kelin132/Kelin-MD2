import test from "node:test";
import assert from "node:assert/strict";
import pinterest, { searchDavidCyrilPinterest } from "../plugins/download/pin.js";

test("Pinterest uses the documented David Cyril route with the key in a header", async () => {
  let request;
  const body = { results: [{ image: "https://images.example/pin.jpg" }] };
  const result = await searchDavidCyrilPinterest("anime wallpaper", {
    apiKey: "test-key-only",
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return { ok: true, json: async () => body };
    },
  });

  assert.equal(new URL(request.url).pathname, "/search/pinterest");
  assert.equal(new URL(request.url).searchParams.get("text"), "anime wallpaper");
  assert.equal(request.options.headers["X-API-Key"], "test-key-only");
  assert.equal(request.url.includes("test-key-only"), false);
  assert.deepEqual(result, body);
});

test("Pinterest tries the next provider when the first provider's image is dead", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input) => {
    const pathname = new URL(String(input)).pathname;
    calls.push(pathname);
    if (pathname.endsWith("/googleimage")) {
      return { ok: true, status: 200, json: async () => ({ results: [{ url: "https://images.example/dead.jpg" }] }) };
    }
    if (pathname.endsWith("/pinterest")) {
      return { ok: true, status: 200, json: async () => ({ results: [{ url: "https://images.example/live.jpg" }] }) };
    }
    if (pathname.endsWith("/dead.jpg")) return { ok: false, status: 404 };
    if (pathname.endsWith("/live.jpg")) {
      return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => Buffer.from([0xff, 0xd8, 0xff, 0xd9]) };
    }
    throw new Error("unexpected URL");
  };
  try {
    const messages = [];
    await pinterest.run({
      sock: { sendMessage: async (_, payload) => messages.push(payload) },
      msg: { key: { remoteJid: "room@g.us" } },
      text: "anime wallpaper",
    });
    assert.ok(messages.some(message => Buffer.isBuffer(message.image)));
    assert.equal(calls.length, 4);
    assert.ok(calls[0].endsWith("/googleimage"));
    assert.ok(calls[1].endsWith("/dead.jpg"));
    assert.ok(calls[2].endsWith("/pinterest"));
    assert.ok(calls[3].endsWith("/live.jpg"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
