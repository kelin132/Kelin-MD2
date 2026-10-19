import test from "node:test";
import assert from "node:assert/strict";
import { shortRead, invalidateShortRead } from "../lib/shortReadCache.mjs";

test("simultaneous and repeated AFK reads share one lookup", async () => {
  let calls = 0;
  const loader = async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return null;
  };
  await Promise.all([shortRead("user", loader), shortRead("user", loader)]);
  await shortRead("user", loader);
  assert.equal(calls, 1);
});

test("changing AFK status invalidates a cached miss and an older in-flight read", async () => {
  const key = "user-invalidation-test";
  let calls = 0;
  let release;
  const oldRead = shortRead(key, () => new Promise(resolve => {
    calls++;
    release = resolve;
  }));
  await Promise.resolve();
  invalidateShortRead(key);
  const fresh = await shortRead(key, async () => {
    calls++;
    return { reason: "back" };
  });
  release(null);
  await oldRead;
  assert.deepEqual(fresh, { reason: "back" });
  assert.deepEqual(await shortRead(key, async () => null), { reason: "back" });
  assert.equal(calls, 2);
});
