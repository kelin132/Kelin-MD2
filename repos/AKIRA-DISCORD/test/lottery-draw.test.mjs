import test from "node:test";
import assert from "node:assert/strict";
import {
  lotteryTicketDiscordId,
  lotteryWinnerIdentity,
} from "../lib/lotteryDraw.mjs";

test("credits bare WhatsApp lottery identities using their full JID", () => {
  assert.equal(
    lotteryWinnerIdentity({ userId: "263771234567" }),
    "263771234567@s.whatsapp.net",
  );
});

test("preserves full WhatsApp and namespaced Discord lottery identities", () => {
  assert.equal(
    lotteryWinnerIdentity({ userId: "263771234567@s.whatsapp.net" }),
    "263771234567@s.whatsapp.net",
  );
  assert.equal(
    lotteryWinnerIdentity({ userId: "discord:123456789012345678" }),
    "discord:123456789012345678",
  );
});

test("only treats explicitly Discord-backed tickets as mentionable Discord users", () => {
  assert.equal(
    lotteryTicketDiscordId({ userId: "263771234567" }),
    null,
  );
  assert.equal(
    lotteryTicketDiscordId({ userId: "discord:123456789012345678" }),
    "123456789012345678",
  );
  assert.equal(
    lotteryTicketDiscordId({
      userId: "263771234567",
      discordId: "123456789012345678",
    }),
    "123456789012345678",
  );
});