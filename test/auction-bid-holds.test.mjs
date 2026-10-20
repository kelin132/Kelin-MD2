import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { deleteAuction, getAuction, setAuction } from "../lib/auctionManager.mjs";

const state = { holds: [], cleared: [], failFor: null };
globalThis.__auctionBidHoldFixture = state;

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/plugins/economy/database.js")) return {
      format: "module",
      shortCircuit: true,
      source: `
        export const isRegistered = async () => true;
        export const getUser = async () => ({ money: 10000 });
        export async function setAuctionHold(id, auctionId, amount, expiresAt) {
          const state = globalThis.__auctionBidHoldFixture;
          if (id === state.failFor) return false;
          state.holds.push({ id, auctionId, amount, expiresAt });
          return true;
        }
        export async function clearAuctionHold(id, auctionId) {
          globalThis.__auctionBidHoldFixture.cleared.push({ id, auctionId });
          return true;
        }
      `,
    };
    return nextLoad(url, context);
  },
});

const { default: bid } = await import("../plugins/cards/bid.js");

async function runBid(group, sender, amount) {
  const messages = [];
  await bid.run({
    sender,
    args: [String(amount)],
    msg: { key: { remoteJid: group } },
    sock: { sendMessage: async (_jid, payload) => messages.push(payload) },
  });
  return messages;
}

test("each winning bid stores a shared hold and releases the outbid user's hold", async () => {
  const group = "shared-hold-bid-fixture@g.us";
  const seller = "263770000000@s.whatsapp.net";
  const first = "263771111111@s.whatsapp.net";
  const second = "263772222222@s.whatsapp.net";
  const endsAt = Date.now() + 60_000;
  state.holds.length = 0;
  state.cleared.length = 0;
  state.failFor = null;
  setAuction(group, {
    sellerJid: seller,
    card: { name: "Fixture", tier: "Rare" },
    currentBid: 0,
    currentBidder: null,
    startBid: 50,
    endsAt,
  });

  try {
    await runBid(group, first, 100);
    assert.equal(getAuction(group).currentBidder, first);
    assert.deepEqual(state.holds.at(-1), {
      id: first,
      auctionId: `whatsapp:${group}`,
      amount: 100,
      expiresAt: endsAt + 5 * 60 * 1000,
    });

    await runBid(group, second, 200);
    assert.equal(getAuction(group).currentBidder, second);
    assert.equal(state.cleared[0].id, first);
    assert.equal(state.holds.at(-1).id, second);
    assert.equal(state.holds.at(-1).amount, 200);
  } finally {
    deleteAuction(group);
  }
});

test("a bid is rolled back if its shared wallet hold cannot be stored", async () => {
  const group = "failed-shared-hold-bid-fixture@g.us";
  const seller = "263770000000@s.whatsapp.net";
  const first = "263771111111@s.whatsapp.net";
  const second = "263772222222@s.whatsapp.net";
  state.holds.length = 0;
  state.cleared.length = 0;
  setAuction(group, {
    sellerJid: seller,
    card: { name: "Fixture", tier: "Rare" },
    currentBid: 100,
    currentBidder: first,
    startBid: 50,
    endsAt: Date.now() + 60_000,
  });
  state.failFor = second;

  try {
    const messages = await runBid(group, second, 200);
    assert.equal(getAuction(group).currentBidder, first);
    assert.equal(getAuction(group).currentBid, 100);
    assert.match(messages[0].text, /couldn't secure this bid/i);
  } finally {
    state.failFor = null;
    deleteAuction(group);
  }
});
