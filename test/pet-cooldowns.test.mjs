import test from "node:test";
import assert from "node:assert/strict";
import { formatPetCooldown, PET_DAILY_COOLDOWN_MS, PET_FEED_COOLDOWN_MS, PET_PLAY_COOLDOWN_MS } from "../lib/petCooldowns.mjs";

const now = Date.parse("2026-10-12T12:00:00Z");

test("pet list cooldowns show exact remaining hours and minutes", () => {
  assert.equal(formatPetCooldown(now - 30 * 60_000, PET_FEED_COOLDOWN_MS, now), "1h 30m");
  assert.equal(formatPetCooldown(now - 15 * 60_000, PET_PLAY_COOLDOWN_MS, now), "0h 45m");
  assert.equal(formatPetCooldown(now - 60_000, PET_DAILY_COOLDOWN_MS, now), "23h 59m");
});

test("pet cooldowns show READY when unused or expired", () => {
  assert.equal(formatPetCooldown(null, PET_FEED_COOLDOWN_MS, now), "READY");
  assert.equal(formatPetCooldown(now - PET_PLAY_COOLDOWN_MS, PET_PLAY_COOLDOWN_MS, now), "READY");
  assert.equal(formatPetCooldown(new Date("invalid"), PET_DAILY_COOLDOWN_MS, now), "READY");
});
