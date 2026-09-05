import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEconomyLinkPreview,
  getEconomyPreviewConfig,
} from "../lib/economyPreview.mjs";

test("daily, weekly, and monthly rewards use AIDORU destinations", async () => {
  const expected = {
    daily: "https://aidoru.zone.id/journey",
    weekly: "https://aidoru.zone.id/arcade",
    monthly: "https://aidoru.zone.id/arcade",
  };

  for (const [command, url] of Object.entries(expected)) {
    const config = getEconomyPreviewConfig(command);
    const preview = await buildEconomyLinkPreview(command);

    assert.equal(config?.url, url);
    assert.equal(preview?.["canonical-url"], url);
    assert.equal(preview?.["matched-text"], url);
    assert.equal(typeof preview?.title, "string");
    assert.equal(typeof preview?.description, "string");
    assert.ok(Buffer.isBuffer(preview?.jpegThumbnail));
  }
});