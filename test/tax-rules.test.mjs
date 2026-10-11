import test from "node:test";
import assert from "node:assert/strict";
import {
  HIGH_WEALTH_TAX_RATE,
  STANDARD_TAX_RATE,
  TAX_WEALTH_THRESHOLD,
  taxRateForWealth,
  wealthTaxExpression,
} from "../lib/taxRules.mjs";

test("the 20% rate starts at exactly $300 million total wealth", () => {
  assert.equal(taxRateForWealth(TAX_WEALTH_THRESHOLD - 1), STANDARD_TAX_RATE);
  assert.equal(taxRateForWealth(TAX_WEALTH_THRESHOLD), HIGH_WEALTH_TAX_RATE);
  assert.equal(taxRateForWealth(TAX_WEALTH_THRESHOLD + 1), HIGH_WEALTH_TAX_RATE);
});

test("the Mongo tax rule measures wealth as wallet plus bank", () => {
  assert.deepEqual(wealthTaxExpression(), {
    $cond: [
      {
        $gte: [
          {
            $add: [
              { $ifNull: ["$money", 0] },
              { $ifNull: ["$bank", 0] },
            ],
          },
          TAX_WEALTH_THRESHOLD,
        ],
      },
      HIGH_WEALTH_TAX_RATE,
      STANDARD_TAX_RATE,
    ],
  });
});
