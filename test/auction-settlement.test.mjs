import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { deleteAuction, getAuction, setAuction } from "../lib/auctionManager.mjs";

const fixture = {
  cards: new Map(),
  economy: new Map(),
  debitCalls: [],
  creditCalls: [],
  histories: [],
  clearedHolds: [],
};
globalThis.__auctionSettlementFixture = fixture;

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/plugins/cards/db.js")) return {
      format: "module",
      shortCircuit: true,
      source: `
        export async function findOrCreateUser(id) {
          return globalThis.__auctionSettlementFixture.cards.get(id);
        }
      `,
    };
    if (url.endsWith("/plugins/economy/database.js")) return {
      format: "module",
      shortCircuit: true,
      source: `
        export const isRegistered = async () => true;
        export async function debitWalletIfAvailable(id, amount) {
          const state = globalThis.__auctionSettlementFixture;
          state.debitCalls.push({ id, amount });
          const user = state.economy.get(id);
          if (!user || user.money < amount) return null;
          user.money -= amount;
          return { money: user.money, bank: user.bank || 0 };
        }
        export async function addMoney(id, amount) {
          const state = globalThis.__auctionSettlementFixture;
          state.creditCalls.push({ id, amount });
          state.economy.get(id).money += amount;
        }
        export async function addHistory(...entry) {
          globalThis.__auctionSettlementFixture.histories.push(entry);
        }
        export async function clearAuctionHold(id, auctionId) {
          globalThis.__auctionSettlementFixture.clearedHolds.push({ id, auctionId });
          return true;
        }
      `,
    };
    if (url.endsWith("/lib/cardApi.mjs")) return {
      format: "module",
      shortCircuit: true,
      source: "export const TIER_EMOJI = {};",
    };
    return nextLoad(url, context);
  },
});

const { closeAuction } = await import("../plugins/cards/auction.js");

function makeCardStore({ sellerMoney = 0, winnerMoney = 0 } = {}) {
  const seller = { cards: [], totalCards: 0, async save() {} };
  const winner = { cards: [], totalCards: 0, async save() {} };
  fixture.cards.set("seller@s.whatsapp.net", seller);
  fixture.cards.set("winner@s.whatsapp.net", winner);
  fixture.economy.set("seller@s.whatsapp.net", { money: sellerMoney, bank: 0 });
  fixture.economy.set("winner@s.whatsapp.net", { money: winnerMoney, bank: 0 });
  return { seller, winner };
}

function makeAuction(group, currentBidder = "winner@s.whatsapp.net") {
  const sock = { sendMessage: async () => {} };
  const card = { cardId: "card-1", name: "Test Card", tier: "Rare" };
  setAuction(group, {
    sock,
    card,
    sellerJid: "seller@s.whatsapp.net",
    currentBid: 100,
    currentBidder,
    startBid: 50,
    endsAt: Date.now() + 1_000,
  });
  return { sock, card };
}

test("auction close charges the winner before awarding the card and credits the seller", async () => {
  const group = "settlement-success@g.us";
  fixture.cards.clear();
  fixture.economy.clear();
  fixture.debitCalls.length = 0;
  fixture.creditCalls.length = 0;
  fixture.histories.length = 0;
  fixture.clearedHolds.length = 0;
  const { seller, winner } = makeCardStore({ sellerMoney: 250, winnerMoney: 500 });
  makeAuction(group);

  await closeAuction(group);
  assert.equal(getAuction(group), null);
  assert.equal(fixture.debitCalls.length, 1);
  assert.equal(fixture.debitCalls[0].amount, 100);
  assert.equal(fixture.creditCalls[0].amount, 100);
  assert.equal(fixture.economy.get("seller@s.whatsapp.net").money, 350);
  assert.equal(fixture.economy.get("winner@s.whatsapp.net").money, 400);
  assert.equal(winner.cards.length, 1);
  assert.equal(fixture.histories.length, 2);
  assert.equal(fixture.clearedHolds.length, 1);
});

test("auction close returns the card when the highest bidder cannot still afford it", async () => {
  const group = "settlement-unaffordable@g.us";
  fixture.cards.clear();
  fixture.economy.clear();
  fixture.debitCalls.length = 0;
  fixture.creditCalls.length = 0;
  fixture.clearedHolds.length = 0;
  const { seller, winner } = makeCardStore({ sellerMoney: 0, winnerMoney: 40 });
  makeAuction(group);

  await closeAuction(group);
  assert.equal(getAuction(group), null);
  assert.equal(fixture.creditCalls.length, 0);
  assert.equal(seller.cards.length, 1);
  assert.equal(winner.cards.length, 0);
  assert.equal(fixture.clearedHolds.length, 1);
});
