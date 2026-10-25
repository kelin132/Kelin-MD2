import test from "node:test";
import assert from "node:assert/strict";
import { persistChargedSummon } from "../lib/summonPersistence.mjs";

test("does not charge when the atomic debit finds insufficient funds", async () => {
  let saved = false;
  const result = await persistChargedSummon({
    debit: async () => null,
    savePending: async () => { saved = true; },
    hasPending: async () => false,
    refund: async () => {},
  });
  assert.equal(result.status, "insufficient");
  assert.equal(saved, false);
});

test("refunds only after confirming the pending card was not saved", async () => {
  let refunded = 0;
  const result = await persistChargedSummon({
    debit: async () => ({ money: 100 }),
    savePending: async () => { throw new Error("write failed"); },
    hasPending: async () => false,
    refund: async () => { refunded += 1; },
  });
  assert.equal(result.status, "refunded");
  assert.equal(refunded, 1);
});

test("never refunds when a follow-up check finds the saved card or cannot determine state", async () => {
  for (const [hasPending, expected] of [[async () => true, "saved"], [async () => { throw Error("read failed"); }, "uncertain"]]) {
    let refunded = 0;
    const result = await persistChargedSummon({
      debit: async () => ({ money: 100 }),
      savePending: async () => { throw new Error("write acknowledgement lost"); },
      hasPending,
      refund: async () => { refunded += 1; },
    });
    assert.equal(result.status, expected);
    assert.equal(refunded, 0);
  }
});
