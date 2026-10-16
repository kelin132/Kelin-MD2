import test from "node:test";
import assert from "node:assert/strict";
import { createOtpPlugin, createOtpPayload } from "../plugins/utilities/otp.js";

const pending = {
  kind: "verification",
  code: "123456",
  expiresAt: "2030-01-01T12:34:00.000Z",
};

test("OTP requests in groups are redirected to a private chat without revealing the code", async () => {
  const sent = [];
  const otpPlugin = createOtpPlugin(async () => pending);
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

test("OTP requests in private chat send the pending code to that account", async () => {
  const sent = [];
  const lookups = [];
  const otpPlugin = createOtpPlugin(async (jid) => {
    lookups.push(jid);
    return pending;
  });

  await otpPlugin.run({
    sock: {
      async sendMessage(...args) {
        sent.push(args);
      },
    },
    msg: { key: { remoteJid: "263771234567@s.whatsapp.net" } },
    sender: "263771234567@s.whatsapp.net",
  });

  assert.deepEqual(lookups, ["263771234567@s.whatsapp.net"]);
  assert.equal(sent.length, 1);
  assert.match(sent[0][1].text, /123456/);
  assert.equal(sent[0][0], "263771234567@s.whatsapp.net");
});

test("OTP payload keeps the private-chat account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
  });

  assert.match(payload.text, /For: \*263771234567\*/);
});