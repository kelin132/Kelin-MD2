import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { deleteAuction, setAuction } from "../lib/auctionManager.mjs";

const phone = "263771234567@s.whatsapp.net";
const lid = "123456789@lid";
const calls = { registrations: [], reads: [], saves: [], history: [], holdFor: null };
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith("/plugins/economy/database.js")) return {
      format: "module",
      shortCircuit: true,
      source: `
        export const requireRegistration = async () => true;
        export const isRegistered = async id => {
          globalThis.giveLidCalls.registrations.push(id);
          return id === ${JSON.stringify(phone)};
        };
        export const getUser = async id => {
          globalThis.giveLidCalls.reads.push(id);
          return {
            money: 1000,
            name: id === ${JSON.stringify(phone)} ? "Recipient" : "Sender",
            auctionHolds: id === globalThis.giveLidCalls.holdFor
              ? { active: { expiresAt: Date.now() + 60000 } } : {},
          };
        };
        export const saveUser = async (id, user) => globalThis.giveLidCalls.saves.push({ id, user });
        export const addHistory = async (...args) => globalThis.giveLidCalls.history.push(args);
      `,
    };
    if (url.endsWith("/lib/identity.mjs")) return {
      format: "module",
      shortCircuit: true,
      source: `
        export const normalizeJid = value => value;
        export const resolveAndMigrateIdentity = async (id, sock, chat, alternate) =>
          id.endsWith("@lid") ? (alternate || await sock.signalRepository.lidMapping.getPNForLID(id)) : id;
      `,
    };
    return nextLoad(url, context);
  },
});
globalThis.giveLidCalls = calls;
const { default: give } = await import("../plugins/economy/give.js");

test("tagged LID recipient is resolved to the registered phone account before give checks", async () => {
  const messages = [];
  await give.run({
    sender: "263779999999@s.whatsapp.net",
    args: ["500"],
    msg: {
      key: { remoteJid: "fixture@g.us" },
      message: {
        extendedTextMessage: {
          contextInfo: { mentionedJid: [lid], mentionedJidAlt: [phone] },
        },
      },
    },
    sock: { sendMessage: async (_jid, payload) => messages.push(payload) },
  });
  assert.deepEqual(calls.registrations, [phone]);
  assert.ok(calls.reads.includes(phone));
  assert.ok(calls.saves.some(({ id }) => id === phone));
  assert.ok(messages.every((message) => !message.text.includes("not registered")));
});


test("give accepts a phone number split by display spaces and country-code formatting", async () => {
  const messages = [];
  await give.run({
    sender: "263779999999@s.whatsapp.net",
    args: ["+234", "916", "880", "8440", "500"],
    msg: { key: { remoteJid: "fixture@g.us" }, message: { conversation: ".give" } },
    sock: { sendMessage: async (_jid, payload) => messages.push(payload) },
  });
  assert.ok(calls.registrations.includes("2349168808440@s.whatsapp.net"));
  assert.ok(messages.every((message) => !message.text.includes("Please mention a user")));
});

test("give is blocked while the sender holds the highest auction bid", async () => {
  const group = "give-auction-lock-fixture@g.us";
  const sender = "263779999999@s.whatsapp.net";
  const messages = [];
  const savedBefore = calls.saves.length;
  setAuction(group, {
    sellerJid: phone,
    currentBid: 500,
    currentBidder: sender,
    startBid: 100,
    endsAt: Date.now() + 60_000,
  });
  try {
    await give.run({
      sender,
      args: ["500"],
      msg: {
        key: { remoteJid: group },
        message: { extendedTextMessage: { contextInfo: { mentionedJid: [phone] } } },
      },
      sock: { sendMessage: async (_jid, payload) => messages.push(payload) },
    });
    assert.match(messages[0].text, /hold the highest auction bid/i);
    assert.equal(calls.saves.length, savedBefore);
  } finally {
    deleteAuction(group);
  }
});

test("give also respects a shared Mongo auction hold from the other bot", async () => {
  const sender = "263779999999@s.whatsapp.net";
  const messages = [];
  const savedBefore = calls.saves.length;
  calls.holdFor = sender;
  try {
    await give.run({
      sender,
      args: ["500"],
      msg: {
        key: { remoteJid: "discord-shared-wallet-fixture@g.us" },
        message: { extendedTextMessage: { contextInfo: { mentionedJid: [phone] } } },
      },
      sock: { sendMessage: async (_jid, payload) => messages.push(payload) },
    });
    assert.match(messages[0].text, /hold the highest auction bid/i);
    assert.equal(calls.saves.length, savedBefore);
  } finally {
    calls.holdFor = null;
  }
});
