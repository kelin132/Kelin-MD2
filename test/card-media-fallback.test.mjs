import test from "node:test";
import assert from "node:assert/strict";

const originalFfmpegPath = process.env.FFMPEG_PATH;
process.env.FFMPEG_PATH = "/missing/ffmpeg-for-card-media-test";
const { sendCardMedia } = await import("../lib/cardApi.mjs?media-fallback-test");
if (originalFfmpegPath === undefined) delete process.env.FFMPEG_PATH;
else process.env.FFMPEG_PATH = originalFfmpegPath;

test("falls back to the card API thumbnail when animated-media conversion is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  const delivered = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return new Response(Buffer.from("fake animation bytes"), {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
  };
  const sock = {
    async sendMessage(chatId, payload) {
      delivered.push({ chatId, payload });
      return payload;
    },
  };

  try {
    await sendCardMedia(sock, "media-test@g.us", {
      media: "https://cards.example/animated?id=1",
      thumbnail: "https://cards.example/thumbnail.jpg",
      mediaType: "gif",
      tierNum: "UR",
    }, "Card caption");

    assert.equal(requestedUrls.length, 2);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].payload.image.url, "https://cards.example/thumbnail.jpg");
    assert.match(delivered[0].payload.caption, /showing a still image/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
