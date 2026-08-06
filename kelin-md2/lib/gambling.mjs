/**
 * Independent random helpers for wager outcomes.
 *
 * Each call gets a fresh cryptographically-random value. No result is stored
 * or reused between commands, so a previous win cannot influence the next bet.
 */
import { randomInt as cryptoRandomInt } from "node:crypto";

export function randomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError("randomInt requires integer bounds with max >= min");
  }
  return cryptoRandomInt(min, max + 1);
}

export function randomChoice(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError("randomChoice requires a non-empty array");
  }
  return values[randomInt(0, values.length - 1)];
}

export function randomChance(probability) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError("randomChance requires a probability between 0 and 1");
  }
  return cryptoRandomInt(0, 1_000_000) < Math.floor(probability * 1_000_000);
}