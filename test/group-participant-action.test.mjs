import test from "node:test";
import assert from "node:assert/strict";
import { participantActionSucceeded } from "../lib/groupParticipantAction.mjs";

test("accepts a confirmed removal for every requested member", () => {
  assert.equal(participantActionSucceeded([{ status: "200", jid: "user@s.whatsapp.net" }], 1), true);
  assert.equal(participantActionSucceeded([{ status: 200 }], 1), true);
});

test("rejects failed, missing, or partial participant results", () => {
  assert.equal(participantActionSucceeded([{ status: "403" }], 1), false);
  assert.equal(participantActionSucceeded([], 1), false);
  assert.equal(participantActionSucceeded([{ status: "200" }], 2), false);
  assert.equal(participantActionSucceeded(null, 1), false);
});
