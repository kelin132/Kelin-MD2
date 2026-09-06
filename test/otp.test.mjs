import test from "node:test";
import assert from "node:assert/strict";
import { createOtpPayload } from "../plugins/utilities/otp.js";

const pending = {
  kind: "verification",
  code: "123456",
  expiresAt: "2030-01-01T12:34:00.000Z",
};

test("OTP payload mentions the requesting member when used in a group", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
    isGroup: true,
  });

  assert.match(payload.text, /For: @263771234567/);
  assert.match(payload.text, /One-time code: \*123456\*/);
});

test("OTP payload keeps the private-chat account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
  });

  assert.match(payload.text, /For: \*263771234567\*/);
});