import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteAuction,
  hasActiveBidder,
  placeBid,
  setAuction,
  withAuctionLock,
  withBidderLock,
} from "../lib/auctionManager.mjs";

test("an active highest bidder is detected across device-qualified JIDs and clears when outbid", () => {
  const group = "auction-lock-fixture@g.us";
  setAuction(group, {
    sellerJid: "263770000000@s.whatsapp.net",
    currentBid: 100,
    currentBidder: "263771111111:4@s.whatsapp.net",
    startBid: 10,
    endsAt: Date.now() + 60_000,
  });

  try {
    assert.equal(hasActiveBidder("263771111111@s.whatsapp.net"), true);
    assert.equal(placeBid(group, "263772222222@s.whatsapp.net", 150).ok, true);
    assert.equal(hasActiveBidder("263771111111@s.whatsapp.net"), false);
    assert.equal(hasActiveBidder("263772222222@s.whatsapp.net"), true);
  } finally {
    deleteAuction(group);
  }
});

test("balance-sensitive actions for the same bidder are serialized", async () => {
  const events = [];
  let releaseFirst;
  const first = withBidderLock("263773333333@s.whatsapp.net", async () => {
    events.push("first-start");
    await new Promise((resolve) => { releaseFirst = resolve; });
    events.push("first-end");
  });
  const second = withBidderLock("263773333333:9@s.whatsapp.net", async () => {
    events.push("second");
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["first-start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["first-start", "first-end", "second"]);
});

test("bids and auction settlement serialize on the same group", async () => {
  const events = [];
  let releaseFirst;
  const first = withAuctionLock("group-lock-fixture@g.us", async () => {
    events.push("bid-start");
    await new Promise((resolve) => { releaseFirst = resolve; });
    events.push("bid-end");
  });
  const second = withAuctionLock("group-lock-fixture@g.us", async () => {
    events.push("close");
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["bid-start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ["bid-start", "bid-end", "close"]);
});
