import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@whiskeysockets/baileys") {
      return { url: "mock:baileys-forward", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "mock:baileys-forward") return {
      format: "module",
      shortCircuit: true,
      source: `
        export function generateForwardMessageContent(message) {
          const content = structuredClone(message.message);
          const key = Object.keys(content)[0];
          if (key === "conversation") {
            content.extendedTextMessage = { text: content.conversation };
            delete content.conversation;
          }
          const contentKey = key === "conversation" ? "extendedTextMessage" : key;
          const messageContent = content[contentKey];
          messageContent.contextInfo = {
            forwardingScore: 1,
            isForwarded: true,
          };
          return content;
        }
      `,
    };
    return nextLoad(url, context);
  },
});

import {
  startChannelAnnouncementRelay,
  stopChannelAnnouncementRelay,
} from "../lib/channelAnnouncementRelay.mjs";

test("channel relay forwards only new messages from its configured source once", async () => {
  const ev = new EventEmitter();
  const sent = [];
  const followed = [];
  const sock = {
    ev,
    newsletterMetadata: async (type, code) => {
      assert.equal(type, "invite");
      assert.equal(code, "channel-invite");
        return { id: "source@newsletter", name: "Aidoru Updates" };
    },
    newsletterFollow: async (jid) => followed.push(jid),
    groupGetInviteInfo: async (code) => {
      assert.equal(code, "community-invite");
      return { id: "destination@g.us" };
    },
    relayMessage: async (jid, content, options) => {
      sent.push({ jid, content, options });
    },
  };
  const logger = () => {};
  assert.equal(await startChannelAnnouncementRelay(sock, {
    channelInviteCode: "channel-invite",
    communityInviteCode: "community-invite",
    logger,
  }), true);
  assert.deepEqual(followed, ["source@newsletter"]);

  const currentTimestamp = Math.floor(Date.now() / 1000) + 1;
  const announcement = {
    key: { remoteJid: "source@newsletter", id: "announcement-1" },
    messageTimestamp: currentTimestamp,
    message: { conversation: "New channel update" },
  };
  ev.emit("messages.upsert", { type: "append", messages: [
    announcement,
    { ...announcement, key: { ...announcement.key, remoteJid: "unrelated@newsletter" } },
    { ...announcement, key: { ...announcement.key, id: "own-message", fromMe: true } },
    { ...announcement, key: { ...announcement.key, id: "old-message" }, messageTimestamp: 1 },
    announcement,
  ] });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, "destination@g.us");
  assert.equal(sent[0].content.extendedTextMessage.text, "New channel update");
  assert.equal(sent[0].content.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo.newsletterJid, "source@newsletter");
  assert.equal(sent[0].content.extendedTextMessage.contextInfo.forwardedNewsletterMessageInfo.newsletterName, "Aidoru Updates");
  assert.equal(sent[0].content.extendedTextMessage.contextInfo.isForwarded, true);
  stopChannelAnnouncementRelay(sock);
});

test("community invite resolves to its announcement group when the bot is already a member", async () => {
  const ev = new EventEmitter();
  const sock = {
    ev,
    newsletterMetadata: async () => ({ id: "source@newsletter" }),
    newsletterFollow: async () => {},
    groupGetInviteInfo: async () => ({ id: "community@g.us", isCommunity: true }),
    groupFetchAllParticipating: async () => ({
      "community-announcements@g.us": {
        id: "community-announcements@g.us",
        isCommunityAnnounce: true,
        linkedParent: "community@g.us",
      },
    }),
    relayMessage: async () => {},
  };
  assert.equal(await startChannelAnnouncementRelay(sock, { logger: () => {} }), true);
  stopChannelAnnouncementRelay(sock);
});
