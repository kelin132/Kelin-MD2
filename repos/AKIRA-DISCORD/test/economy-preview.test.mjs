import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEconomyLinkPreview,
  getEconomyPreviewConfig,
} from "../lib/economyPreview.mjs";
import { toDiscordPayload } from "../lib/discordPayload.mjs";

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
    assert.ok(Buffer.isBuffer(preview?.jpegThumbnail));
  }
});

test("reward text with a link preview becomes a clickable Discord image embed", async () => {
  const preview = await buildEconomyLinkPreview("daily");
  const payload = toDiscordPayload(
    {
      text: "🎁 Daily reward claimed: +$50K",
      linkPreview: preview,
    },
    { command: "daily", accentColor: "#FFD166" },
  );
  const embed = payload.embeds[0].toJSON();

  assert.equal(embed.title, "🎁 AIDORU Daily Rewards");
  assert.equal(embed.url, "https://aidoru.zone.id/journey");
  assert.equal(embed.image.url, "attachment://aidoru-preview.jpg");
  assert.equal(payload.files[0].name, "aidoru-preview.jpg");
});