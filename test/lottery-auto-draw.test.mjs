import test from "node:test";
import assert from "node:assert/strict";
import {
  LOTTERY_MAX_ENTRIES,
  getWhatsAppParticipantId,
  lotteryWinnerIdentity,
  lotteryWinnerLabel,
} from "../lib/lotteryAutoDraw.mjs";

test("lottery draws after fifteen one-ticket participants", () => {
  assert.equal(LOTTERY_MAX_ENTRIES, 15);
});

test("normalizes WhatsApp phone mentions to a full Baileys JID", () => {
  assert.equal(getWhatsAppParticipantId("263771234567@s.whatsapp.net"), "263771234567@s.whatsapp.net");
  assert.equal(getWhatsAppParticipantId("263771234567"), "263771234567@s.whatsapp.net");
});

test("does not turn a Discord identity into a WhatsApp number", () => {
  const ticket = { userId: "discord:123456789012345678", name: "DiscordName" };
  assert.equal(getWhatsAppParticipantId(ticket.userId), null);
  assert.equal(lotteryWinnerIdentity(ticket), "discord:123456789012345678");
  assert.equal(lotteryWinnerLabel(ticket), "DiscordName");
});

test("shows a WhatsApp winner by phone mention and readable name", () => {
  assert.equal(lotteryWinnerLabel({ userId: "263771234567", name: "Kelin" }), "@263771234567 (Kelin)");
});
