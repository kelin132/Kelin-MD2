import test from "node:test";
import assert from "node:assert/strict";
import { reserveCardSpawn, releaseCardSpawn } from "../lib/cardSpawnState.mjs";
import {
  clearWild,
  releaseWildSpawn,
  reserveWildSpawn,
  setWild,
} from "../lib/pokemon/wildState.mjs";

test("card spawn reservations prevent concurrent spawns in the same chat", () => {
  const chatId = "card-reservation-test@g.us";
  global.activeSpawns = {};
  global.__cardApiSpawnReservations = new Set();

  assert.equal(reserveCardSpawn(chatId), true);
  assert.equal(reserveCardSpawn(chatId), false);
  releaseCardSpawn(chatId);
  global.activeSpawns[chatId] = { spawnId: "active" };
  assert.equal(reserveCardSpawn(chatId), false);

  delete global.activeSpawns[chatId];
  delete global.activeSpawns;
  delete global.__cardApiSpawnReservations;
});

test("wild Pokémon reservations block competing spawns and respect active encounters", () => {
  const chatId = "wild-reservation-test@g.us";

  assert.equal(reserveWildSpawn(chatId), true);
  assert.equal(reserveWildSpawn(chatId), false);
  releaseWildSpawn(chatId);

  setWild(chatId, { name: "pikachu", displayName: "Pikachu" });
  assert.equal(reserveWildSpawn(chatId), false);
  clearWild(chatId);
  assert.equal(reserveWildSpawn(chatId), true);
  releaseWildSpawn(chatId);
});
