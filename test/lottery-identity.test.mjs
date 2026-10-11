import test from "node:test";
import assert from "node:assert/strict";
import {
  findLotteryTicket,
  getWhatsAppParticipantId,
  lotteryDisplayName,
  lotteryWinnerIdentity,
  lotteryWinnerLabel,
  sanitizeLotteryDisplayName,
} from "../lib/lotteryIdentity.mjs";

test("normalizes phone JIDs without exposing their server suffix", () => {
  assert.equal(
    getWhatsAppParticipantId("263771234567:4@s.whatsapp.net"),
    "263771234567@s.whatsapp.net",
  );
  assert.equal(getWhatsAppParticipantId("263771234567"), "263771234567@s.whatsapp.net");
});

test("preserves privacy LIDs as LIDs instead of guessing phone numbers", () => {
  assert.equal(getWhatsAppParticipantId("123456789012345678:4@lid"), "123456789012345678@lid");
  assert.equal(getWhatsAppParticipantId("123456789012345678"), "123456789012345678@lid");
  assert.equal(
    lotteryWinnerIdentity({ userId: "123456789012345678@lid" }),
    "123456789012345678@lid",
  );
});

test("matches existing bare lottery IDs to the full WhatsApp identity", () => {
  const tickets = [{ userId: "263771234567", count: 1 }];
  assert.equal(findLotteryTicket(tickets, "263771234567@s.whatsapp.net"), tickets[0]);
});

test("shows verified phone numbers or readable names, never raw JIDs or LIDs", () => {
  assert.equal(
    lotteryWinnerLabel({ userId: "263771234567@s.whatsapp.net", name: "Kelin" }),
    "@263771234567 (Kelin)",
  );
  assert.equal(
    lotteryWinnerLabel({ userId: "263771234567@s.whatsapp.net", name: "263771234567@lid" }),
    "@263771234567",
  );
  assert.equal(
    lotteryWinnerLabel({ userId: "123456789012345678@lid", name: "Kelin" }),
    "Kelin",
  );
  assert.equal(
    lotteryDisplayName({ userId: "123456789012345678@lid", name: "123456789012345678@lid" }),
    "WhatsApp user",
  );
});

test("removes internal WhatsApp identity strings from profile names", () => {
  assert.equal(sanitizeLotteryDisplayName("263771234567@s.whatsapp.net"), "");
  assert.equal(sanitizeLotteryDisplayName("123456789012345678@lid"), "");
  assert.equal(sanitizeLotteryDisplayName("Kelin"), "Kelin");
});
