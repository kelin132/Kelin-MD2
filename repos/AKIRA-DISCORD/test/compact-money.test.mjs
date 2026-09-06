import test from "node:test";
import assert from "node:assert/strict";
import { compactMoney } from "../lib/compactMoney.mjs";

test("formats economy balances with compact lowercase units", () => {
  assert.equal(compactMoney(999), "$999");
  assert.equal(compactMoney(1_000), "$1k");
  assert.equal(compactMoney(1_100), "$1.1k");
  assert.equal(compactMoney(800_000_000), "$800m");
  assert.equal(compactMoney(1_100_000_000), "$1.1b");
  assert.equal(compactMoney(1_000_000_000_000_000), "$1q");
});