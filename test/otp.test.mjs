import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const pending = {
  kind: "verification",
  code: "123456",
  expiresAt: "2030-01-01T12:34:00.000Z",
};

globalThis.__otpPendingForTest = pending;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/websiteAuth.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export async function getPendingWebsiteCode() { return globalThis.__otpPendingForTest; }",
      };
    }
    return nextLoad(url, context);
  },
});

const { default: otpCommand, createOtpPayload } = await import("../plugins/utilities/otp.js");

test("OTP requested in a group is sent visibly in that group and mentions the requester", async () => {
  const group = "fixture@g.us";
  const sender = "263771234567@s.whatsapp.net";
  const sent = [];
  await otpCommand.run({
    sock: { sendMessage: async (jid, payload, options) => sent.push({ jid, payload, options }) },
    msg: { key: { remoteJid: group, participant: sender } },
    sender,
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, group);
  assert.match(sent[0].payload.text, /One-time code: \*123456\*/);
  assert.match(sent[0].payload.text, /For: @263771234567/);
  assert.deepEqual(sent[0].payload.mentions, [sender]);
  assert.deepEqual(sent[0].options.mentions, [sender]);
});

test("OTP payload keeps the private-chat account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
  });

  assert.match(payload.text, /For: \*263771234567\*/);
});

test("group OTP payload uses a mention instead of a private account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
    isGroup: true,
  });

  assert.match(payload.text, /For: @263771234567/);
});