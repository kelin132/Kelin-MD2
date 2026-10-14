import test from "node:test";
import assert from "node:assert/strict";
import { detectMediaType } from "../lib/mediaType.mjs";

test("detects GIF media from bytes even when its URL has no .gif extension", () => {
  assert.equal(detectMediaType(Buffer.from("GIF89a0000", "ascii")), "gif");
  assert.equal(detectMediaType(Buffer.from("GIF87a0000", "ascii")), "gif");
});

test("detects MP4 and common static images by their file signatures", () => {
  assert.equal(detectMediaType(Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])), "mp4");
  assert.equal(detectMediaType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])), "png");
  assert.equal(detectMediaType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.equal(detectMediaType(Buffer.from("RIFFxxxxWEBP", "ascii")), "webp");
  assert.equal(detectMediaType(Buffer.from("not media")), "unknown");
});
