import test from "node:test";
import assert from "node:assert/strict";
import { clearCachedLeaderboard, getCachedLeaderboard } from "../lib/leaderboardCache.mjs";

test("fresh leaderboard reads do not return expired money snapshots", async () => {
  const key = "test:economy:wealth:fresh";
  clearCachedLeaderboard(key);
  let reads = 0;
  const load = async () => ++reads;
  const options = { ttlMs: 0, staleWhileRevalidate: false };

  assert.equal(await getCachedLeaderboard(key, load, options), 1);
  assert.equal(await getCachedLeaderboard(key, load, options), 2);
  assert.equal(reads, 2);
  clearCachedLeaderboard(key);
});
