import test from "node:test";
import assert from "node:assert/strict";
import { getAnimeSourcePlan } from "../plugins/anime/_helper.js";

test("unsupported providers are skipped instead of returning their default hug GIF", () => {
  assert.deepEqual(
    getAnimeSourcePlan("punch").map(({ name }) => name),
    ["otakugifs", "gifted"],
  );
  assert.deepEqual(
    getAnimeSourcePlan("smack").map(({ name }) => name),
    ["otakugifs"],
  );
});

test("anime GIF categories have a source mapped to their requested reaction", () => {
  for (const reaction of [
    "bite", "blush", "bonk", "cry", "cuddle", "dance", "feed", "fox_girl",
    "handhold", "highfive", "hug", "kill", "kiss", "lick", "meow", "neko",
    "ngif", "pat", "poke", "punch", "slap", "smack", "smile", "smug",
    "tickle", "waifu", "wallpaper", "wave", "wink", "woof", "yeet",
  ]) {
    assert.ok(getAnimeSourcePlan(reaction).length > 0, `${reaction} has no GIF provider`);
  }
});
