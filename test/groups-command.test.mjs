import test from "node:test";
import assert from "node:assert/strict";
import groupsCommand from "../plugins/owner/groups.js";

test("groups command lists names, invite links, and membership status", async () => {
  const sent = [];
  const sock = {
    async groupFetchAllParticipating() {
      return {
        "222@g.us": { id: "222@g.us", subject: "Zeta Group" },
        "111@g.us": { id: "111@g.us", subject: "Alpha Group" },
      };
    },
    async groupInviteCode(jid) {
      if (jid === "111@g.us") return "alphaCode";
      throw new Error("invite code unavailable");
    },
    async sendMessage(jid, content, options) {
      sent.push({ jid, content, options });
    },
  };
  const msg = { key: { remoteJid: "owner@s.whatsapp.net" } };

  await groupsCommand.run({ sock, msg });

  assert.equal(groupsCommand.category, "staff");
  assert.equal(groupsCommand.isOwner, undefined);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, "owner@s.whatsapp.net");
  assert.match(sent[0].content.text, /Groups this bot is in: 2/);
  assert.match(sent[0].content.text, /Alpha Group/);
  assert.match(sent[0].content.text, /https:\/\/chat\.whatsapp\.com\/alphaCode/);
  assert.match(sent[0].content.text, /Zeta Group/);
  assert.match(sent[0].content.text, /invite link unavailable/);
  assert.match(sent[0].content.text, /✅ bot is in group/);
});

test("groups command can list links publicly in a group chat", async () => {
  let fetched = false;
  const sent = [];
  const sock = {
    async groupFetchAllParticipating() {
      fetched = true;
      return {
        "111@g.us": { id: "111@g.us", subject: "Alpha Group" },
      };
    },
    async groupInviteCode() {
      return "alphaCode";
    },
    async sendMessage(jid, content) {
      sent.push({ jid, content });
    },
  };
  const msg = { key: { remoteJid: "staff-group@g.us" } };

  await groupsCommand.run({ sock, msg });

  assert.equal(fetched, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].jid, "staff-group@g.us");
  assert.match(sent[0].content.text, /Alpha Group/);
  assert.match(sent[0].content.text, /https:\/\/chat\.whatsapp\.com\/alphaCode/);
});
