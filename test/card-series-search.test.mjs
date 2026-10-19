import test from "node:test";
import assert from "node:assert/strict";
import { findCardsBySeries, formatSeriesCard } from "../plugins/cards/cs.js";
import { getCardClaimId } from "../lib/cardClaimId.mjs";

test("series card search is case-insensitive and returns matching catalog cards", () => {
  const cards = [
    { cardId: "ABCDE", name: "Naruto Uzumaki", series: "Naruto" },
    { cardId: "FGHIJ", name: "Sasuke Uchiha", series: "Naruto Shippuden" },
    { cardId: "KLMNO", name: "Luffy", series: "One Piece" },
  ];
  assert.deepEqual(findCardsBySeries(cards, "nArUtO").map((card) => card.cardId), ["ABCDE", "FGHIJ"]);
  assert.deepEqual(findCardsBySeries(cards, "").map((card) => card.cardId), []);
});

test("series results show the five-character claim code, never the long API card ID", () => {
  const card = {
    cardId: "VERY_LONG_EXTERNAL_API_IDENTIFIER",
    name: "Naruto Uzumaki",
    series: "Naruto",
    tier: "Rare",
    tierNum: "3",
  };
  const output = formatSeriesCard(card);
  const claimId = getCardClaimId(card);
  assert.match(claimId, /^[A-Z0-9]{5}$/);
  assert.ok(output.includes(`Claim ID \`${claimId}\``));
  assert.ok(!output.includes(card.cardId));
});
