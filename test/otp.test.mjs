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

test("OTP can be requested in a group but the code is delivered only in private chat", async () => {
  const group = "fixture@g.us";
  const sender = "263771234567@s.whatsapp.net";
  const sent = [];
  await otpCommand.run({
    sock: { sendMessage: async (jid, payload, options) => sent.push({ jid, payload, options }) },
    msg: { key: { remoteJid: group, participant: sender } },
    sender,
  });

  assert.equal(sent.length, 2);
  assert.equal(sent[0].jid, sender);
  assert.match(sent[0].payload.text, /One-time code: \*123456\*/);
  assert.equal(sent[1].jid, group);
  assert.doesNotMatch(sent[1].payload.text, /One-time code: \*123456\*/);
  assert.match(sent[1].payload.text, /sent your AIDORU code privately/i);
  assert.deepEqual(sent[1].options.mentions, [sender]);
});

test("OTP payload keeps the private-chat account label", () => {
  const payload = createOtpPayload({
    pending,
    senderJid: "263771234567@s.whatsapp.net",
  });

  assert.match(payload.text, /For: \*263771234567\*/);
});