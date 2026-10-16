import test from "node:test";
import assert from "node:assert/strict";
import otpPlugin, { createOtpPayload } from "../plugins/utilities/otp.js";

const pending = {
  kind: "verification",
  code: "123456",
  expiresAt: "2030-01-01T12:34:00.000Z",
};

test("OTP requests in groups are redirected to a private chat without revealing the code", async () => {
  const sent = [];
  await otpPlugin.run({
    sock: {
      async sendMessage(...args) {
        sent.push(args);
      },
    },
    msg: { key: { remoteJid: "123@g.us" } },
    sender: "263771234567@s.whatsapp.net",
  });

  assert.equal(sent.length, 1);
  assert.match(sent[0][1].text, /private chat/);
  assert.doesNotMatch(sent[0][1].text, /123456/);
});

test("OTP payload keeps the private-chat account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
  });

  assert.match(payload.text, /For: \*263771234567\*/);
});