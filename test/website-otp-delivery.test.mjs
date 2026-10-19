import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

globalThis.websiteOtpDeliveryFixture = null;
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/lib/mongo.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const getDb = () => globalThis.websiteOtpDeliveryFixture.database;",
      };
    }
    if (url.endsWith("/lib/accountIdentity.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const resolveAccountIdentity = async () => ({
            ids: ['2349168808440@s.whatsapp.net', '123456789@lid'],
          });
        `,
      };
    }
    if (url.endsWith("/lib/identity.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const normalizeJid = value => String(value || '').trim();",
      };
    }
    if (url.endsWith("/lib/websiteAuth.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: `
          export const getPendingWebsiteCode = async (jid, options) => {
            globalThis.websiteOtpDeliveryFixture.codeLookup = { jid, options };
            return { kind: 'verification', code: '000123', expiresAt: new Date(Date.now() + 60000).toISOString() };
          };
        `,
      };
    }
    if (url.endsWith("/plugins/utilities/otp.js")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const createOtpPayload = ({ pending, senderJid }) => ({ text: `${senderJid}:${pending.code}` });",
      };
    }
    if (url.endsWith("/lib/logger.mjs")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export const log = () => {};",
      };
    }
    return nextLoad(url, context);
  },
});

const { deliverNextWebsiteOtp } = await import("../lib/websiteOtpDelivery.mjs");

test("queued OTPs go to a linked phone JID, not the account's LID", async () => {
  const job = {
    _id: "job-1",
    userId: "123456789@lid",
    kind: "verification",
    flow: "signup",
    status: "pending",
    attempts: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
  const updates = [];
  const outbox = {
    listIndexes: () => ({ toArray: async () => [{ name: "_id_" }] }),
    createIndex: async () => {},
    findOne: async () => job,
    findOneAndUpdate: async (_filter, update) => ({
      ...job,
      ...update.$set,
      attempts: 1,
    }),
    updateOne: async (filter, update) => updates.push({ filter, update }),
  };
  const account = {
    _id: "123456789@lid",
    registered: false,
    websiteSignupPending: true,
  };
  const users = { findOne: async () => account };
  const database = {
    collection: (name) => name === "website_otp_outbox" ? outbox : users,
  };
  const sent = [];
  globalThis.websiteOtpDeliveryFixture = { database, codeLookup: null };

  assert.equal(
    await deliverNextWebsiteOtp(
      { sendMessage: async (jid, content) => sent.push({ jid, content }) },
      { database, logger: () => {} },
    ),
    true,
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, "2349168808440@s.whatsapp.net");
  assert.match(sent[0].content.text, /000123/);
  assert.equal(globalThis.websiteOtpDeliveryFixture.codeLookup.options.accountId, job.userId);
  assert.equal(updates[0].update.$set.status, "sent");
});
