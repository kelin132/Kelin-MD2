import test from "node:test";
import assert from "node:assert/strict";
import { PET_SPECIES } from "../lib/petData.js";
import { getPetAppearance, getPetMood } from "../lib/petVisuals.mjs";

test("every pet species has a pixel-art form, palette, and room theme", () => {
  for (const species of Object.keys(PET_SPECIES)) {
    const appearance = getPetAppearance(species);
    assert.ok(appearance.form, `${species} should have a sprite form`);
    assert.ok(appearance.room, `${species} should have a room theme`);
    for (const [color, value] of Object.entries(appearance.colors)) {
      assert.match(value, /^#[0-9a-f]{6}$/i, `${species} ${color} should be a hex color`);
    }
  }
});

test("visually distinct animal families use their own sprite silhouettes", () => {
  const forms = new Set(Object.keys(PET_SPECIES).map((species) => getPetAppearance(species).form));
  assert.deepEqual([...forms].sort(), ["bear", "bird", "bunny", "canine", "cat", "dragon", "fish", "slime"]);
});

test("pet mood follows health, hunger, and happiness", () => {
  assert.equal(getPetMood({ hp: 20, maxHp: 100, hunger: 100, happiness: 100 }), "TIRED");
  assert.equal(getPetMood({ hp: 100, maxHp: 100, hunger: 20, happiness: 100 }), "HUNGRY");
  assert.equal(getPetMood({ hp: 100, maxHp: 100, hunger: 100, happiness: 20 }), "LONELY");
  assert.equal(getPetMood({ hp: 100, maxHp: 100, hunger: 100, happiness: 100 }), "HAPPY");
  assert.equal(getPetMood({ hp: 100, maxHp: 100, hunger: 50, happiness: 50 }), "LISTLESS");
});
