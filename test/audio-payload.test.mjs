import test from "node:test";
import assert from "node:assert/strict";
import { inspectAudioPayload, requireAudioPayload } from "../lib/audioPayload.mjs";

test("recognizes actual audio signatures and derives the proper extension", () => {
  assert.equal(inspectAudioPayload(Buffer.from("ID3\u0004\u0000\u0000")).mime, "audio/mpeg");
  assert.equal(inspectAudioPayload(Buffer.from("ID3\u0004\u0000\u0000")).extension, "mp3");
  assert.equal(requireAudioPayload(Buffer.from("OggS")).extension, "ogg");
  assert.equal(requireAudioPayload(Buffer.from("fLaC")).mime, "audio/flac");
});

test("rejects HTML or error text mislabeled as audio", () => {
  assert.equal(inspectAudioPayload(Buffer.from("<html>temporary error</html>")), null);
  assert.throws(() => requireAudioPayload(Buffer.from("rate limit")), /not a recognized audio file/);
});
