import test from "node:test";
import assert from "node:assert/strict";
import { toDiscordPayload } from "../lib/discordPayload.mjs";
import { clearWild, getWild, setWild } from "../lib/pokemon/wildState.mjs";

test("renders text replies as Discord cards with the requested accent rail", () => {
  const payload = toDiscordPayload(
    { text: "🏆 Leaderboard\n#1 Player — $50,000", mentions: ["discord:123456789"] },
    { accentColor: "#F1C40F", title: "🏆 Leaderboard" },
  );

  assert.equal(payload.embeds.length, 1);
  assert.equal(payload.embeds[0].data.color, 0xF1C40F);
  assert.equal(payload.embeds[0].data.title, "🏆 Leaderboard");
  assert.equal(payload.embeds[0].data.description, "🏆 Leaderboard\n#1 Player — $50,000");
  assert.deepEqual(payload.allowedMentions, { users: ["123456789"] });
  assert.equal(payload.content, "<@123456789>");
});

test("converts WhatsApp image URL payloads into renderable Discord attachments", () => {
  const payload = toDiscordPayload({
    image: { url: "https://cdn.example.test/card.webp" },
    caption: "A card appeared",
  });

  assert.deepEqual(payload, {
    content: "A card appeared",
    files: [{
      attachment: "https://cdn.example.test/card.webp",
      name: "image.png",
    }],
  });
});

test("embeds Discord image responses with Aidoru title, accent, and footer", () => {
  const payload = toDiscordPayload({
    image: { url: "https://cdn.example.test/aidoru.webp" },
    caption: "A new idol card appeared",
  }, {
    accentColor: "#FF4FA3",
    command: "card",
    footer: { text: "✦ AIDORU • AKIRA" },
    embedMedia: true,
  });

  assert.equal(payload.content, undefined);
  assert.equal(payload.files[0].name, "image.png");
  assert.equal(payload.embeds.length, 1);
  assert.equal(payload.embeds[0].data.color, 0xFF4FA3);
  assert.equal(payload.embeds[0].data.title, "✦ AIDORU · Card");
  assert.equal(payload.embeds[0].data.description, "A new idol card appeared");
  assert.equal(payload.embeds[0].data.footer.text, "✦ AIDORU • AKIRA");
  assert.equal(payload.embeds[0].data.image.url, "attachment://image.png");
});

test("keeps Discord mentions when artwork is moved into an embed", () => {
  const payload = toDiscordPayload({
    image: { url: "https://cdn.example.test/aidoru.webp" },
    caption: "A new idol card appeared",
    mentions: ["discord:123456789"],
  }, {
    embedMedia: true,
  });

  assert.equal(payload.content, "<@123456789>");
  assert.deepEqual(payload.allowedMentions, { users: ["123456789"] });
  assert.equal(payload.embeds[0].data.description, "A new idol card appeared");
});

test("keeps GIF/video media as Discord file attachments with captions", () => {
  const video = Buffer.from("fake-mp4");
  const payload = toDiscordPayload({
    video,
    mimetype: "video/mp4",
    gifPlayback: true,
    caption: "Animated card",
  });

  assert.equal(payload.content, "Animated card");
  assert.equal(payload.files[0].name, "video.mp4");
  assert.deepEqual(payload.files[0].attachment, video);
});

test("wild Pokémon state is isolated by Discord channel ID", () => {
  clearWild("discord-channel-a");
  clearWild("discord-channel-b");
  setWild("discord-channel-a", { name: "Pikachu", hp: 20, maxHp: 20 });

  assert.equal(getWild("discord-channel-a").pokemon.name, "Pikachu");
  assert.equal(getWild("discord-channel-b"), null);

  clearWild("discord-channel-a");
});