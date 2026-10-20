import test from "node:test";
import assert from "node:assert/strict";
import {
  formatReqbotRequest,
  isBotAdminInGroup,
} from "../lib/reqbotRelay.mjs";

test("only identifies the connected bot as eligible when it is an admin", () => {
  const sock = { user: { id: "15551234567:3@s.whatsapp.net" } };
  const metadata = {
    participants: [
      { id: "15551234567@s.whatsapp.net", admin: "admin" },
      { id: "15559876543@s.whatsapp.net", admin: "superadmin" },
    ],
  };

  assert.equal(isBotAdminInGroup(sock, metadata), true);
  assert.equal(isBotAdminInGroup(
    { user: { id: "15550001111@s.whatsapp.net" } },
    metadata,
  ), false);
  assert.equal(isBotAdminInGroup(sock, {
    participants: [{ id: "15551234567@s.whatsapp.net", admin: null }],
  }), false);
});

test("formats the queued request with its target link and source bot/chat", () => {
  const message = formatReqbotRequest({
    sender: "15551234567@s.whatsapp.net",
    groupLink: "https://chat.whatsapp.com/InviteCode",
    sourceChatJid: "123456789@g.us",
    sourceBotName: "Kelin Main",
    createdAt: new Date("2026-10-12T12:00:00.000Z"),
  });

  assert.match(message, /https:\/\/chat\.whatsapp\.com\/InviteCode/);
  assert.match(message, /15551234567/);
  assert.match(message, /Kelin Main/);
  assert.match(message, /123456789@g\.us/);
});

test("formats website-originated requests with the AIDORU account name", () => {
  const message = formatReqbotRequest({
    sender: "discord:123456789012345678",
    requesterName: "AIDORU Player",
    groupLink: "https://chat.whatsapp.com/InviteCode",
    sourceChatJid: "AIDORU website /reqbot",
    sourceBotName: "AIDORU Website",
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
  });

  assert.match(message, /Name: AIDORU Player/);
  assert.match(message, /AIDORU account: discord:123456789012345678/);
  assert.match(message, /AIDORU Website/);
  assert.doesNotMatch(message, /Number: \+\s*$/m);
});
