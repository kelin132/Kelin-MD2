import test from "node:test";
import assert from "node:assert/strict";
import {
  deliverNextWebsiteOtp,
  startWebsiteOtpDelivery,
} from "../lib/websiteOtpDelivery.mjs";

test("website OTP queue cannot send codes through WhatsApp private delivery", async () => {
  const sent = [];
  const started = startWebsiteOtpDelivery({
    sendMessage: async (...args) => sent.push(args),
  });

  assert.equal(started, false);
  assert.equal(
    await deliverNextWebsiteOtp({
      sendMessage: async (...args) => sent.push(args),
    }),
    false,
  );
  assert.equal(sent.length, 0);
});
