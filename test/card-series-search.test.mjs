import test from "node:test";
import assert from "node:assert/strict";
import { findCardsBySeries } from "../plugins/cards/cs.js";

test("series card search is case-insensitive and returns matching catalog cards", () => {
  const cards = [
    { cardId: "ABCDE", name: "Naruto Uzumaki", series: "Naruto" },
    { cardId: "FGHIJ", name: "Sasuke Uchiha", series: "Naruto Shippuden" },
    { cardId: "KLMNO", name: "Luffy", series: "One Piece" },
  ];
  assert.deepEqual(findCardsBySeries(cards, "nArUtO").map((card) => card.cardId), ["ABCDE", "FGHIJ"]);
  assert.deepEqual(findCardsBySeries(cards, "").map((card) => card.cardId), []);
});
