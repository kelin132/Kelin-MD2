import test from "node:test";
import assert from "node:assert/strict";
import {
  GUILD_WAR_DURATION_MS,
  MAX_GUILD_WAR_MATCHUPS,
  formatGuildWarStatus,
  formatWarTimeRemaining,
  pairWarMembers,
  scoreWarMatchups,
} from "../lib/guildWarRules.mjs";

test("guild wars use a 48-hour timer and pair no more than eight members", () => {
  assert.equal(GUILD_WAR_DURATION_MS, 48 * 60 * 60 * 1000);
  assert.equal(MAX_GUILD_WAR_MATCHUPS, 8);
  const membersA = Array.from({ length: 12 }, (_, index) => ({ jid: `a${index}`, name: `A${index}` }));
  const membersB = Array.from({ length: 10 }, (_, index) => ({ jid: `b${index}`, name: `B${index}` }));
  const pairs = pairWarMembers(membersA, membersB, { random: () => 0.5 });
  assert.equal(pairs.length, 8);
  assert.equal(new Set(pairs.map((pair) => pair.a.jid)).size, 8);
  assert.equal(new Set(pairs.map((pair) => pair.b.jid)).size, 8);
  assert.ok(pairs.every((pair) => pair.status === "Pending"));
});

test("guild war score counts resolved wins and forfeits only", () => {
  assert.deepEqual(scoreWarMatchups([
    { status: "Completed", winnerSide: "a" },
    { status: "Forfeited", winnerSide: "b" },
    { status: "Pending", winnerSide: null },
  ]), { a: 1, b: 1 });
});

test("status layout shows timer, score, and each matchup result", () => {
  const now = new Date("2026-10-11T00:00:00Z");
  const output = formatGuildWarStatus({
    status: "active",
    guildA: { name: "Vengeful Aces" },
    guildB: { name: "We are family" },
    deadlineAt: new Date(now.getTime() + GUILD_WAR_DURATION_MS - 43 * 60_000),
    matchups: [
      { a: { name: "Nagi" }, b: { name: "Varnicky" }, status: "Forfeited", winnerSide: "b" },
      { a: { name: "Dami" }, b: { name: "blue" }, status: "Pending" },
    ],
  }, now.getTime());

  assert.match(output, /State: Battle/);
  assert.match(output, /Time Remaining: 47h 17m/);
  assert.match(output, /Score: 0 - 1/);
  assert.match(output, /@Nagi ⚔️ @Varnicky \[Forfeited\]/);
  assert.match(output, /@Dami ⚔️ @blue \[Pending\]/);
});

test("expired timers clamp at zero instead of becoming negative", () => {
  assert.equal(formatWarTimeRemaining(new Date(0), Date.now()), "0h 00m");
});
