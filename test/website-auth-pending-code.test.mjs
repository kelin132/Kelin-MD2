import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

globalThis.websiteOtpPendingFixture = null;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/mongo.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const getDb = () => globalThis.websiteOtpPendingFixture.db;",
      };
    }
    if (url.endsWith("/lib/identity.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const normalizeJid = value => String(value || '').trim();
          export const findUserByIdentity = async () => globalThis.websiteOtpPendingFixture.user;
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const { getPendingWebsiteCode } = await import("../lib/websiteAuth.mjs");

test("website signup verification codes are retrievable before bot registration completes", async () => {
  const user = {
    _id: "123456789@lid",
    registered: false,
    websiteSignupPending: true,
    websiteVerificationCode: "123456",
    websiteVerificationExpiresAt: new Date(Date.now() + 60_000),
  };
  const collection = {
    findOne: async () => user,
  };
  globalThis.websiteOtpPendingFixture = {
    user,
    db: { collection: () => collection },
  };

  const pending = await getPendingWebsiteCode("2349168808440@s.whatsapp.net");
  assert.equal(pending.kind, "verification");
  assert.equal(pending.code, "123456");
});

test("a website reset request takes precedence over an older active signup code", async () => {
  const requestedAt = new Date();
  const expiresAt = new Date(Date.now() + 60_000);
  const user = {
    _id: "2349168808440@s.whatsapp.net",
    registered: true,
    websiteId: "AID-ABCDEF1234",
    websiteVerificationCode: "111111",
    websiteVerificationExpiresAt: expiresAt,
    websiteOtpRequestedAt: requestedAt,
    websiteOtpExpiresAt: expiresAt,
  };
  let update;
  const collection = {
    findOne: async () => user,
    findOneAndUpdate: async (filter, changes) => {
      update = { filter, changes };
      return { ...user };
    },
  };
  globalThis.websiteOtpPendingFixture = {
    user,
    db: { collection: () => collection },
  };

  const pending = await getPendingWebsiteCode(user._id);
  assert.equal(pending.kind, "reset");
  assert.equal(pending.source, "website-otp-request");
  assert.match(pending.code, /^\d{6}$/);
  assert.equal(update.filter.websiteOtpRequestedAt, requestedAt);
  assert.equal(update.changes.$unset.websiteOtpRequestedAt, "");
});
