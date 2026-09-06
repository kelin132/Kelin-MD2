import test from "node:test";
import assert from "node:assert/strict";
import registerPlugin from "../plugins/economy/register.js";

test("Discord register shows website onboarding without creating a local account", async () => {
  let replyPayload;
  let sockCalls = 0;
  const message = {
    author: { id: "123456789", username: "Pignito" },
    member: { id: "123456789", displayName: "Pignito" },
    reply: async (payload) => {
      replyPayload = payload;
      return payload;
    },
  };

  await registerPlugin.run({
    discord: { message },
    msg: { key: { remoteJid: "channel-1" } },
    sender: "discord:123456789",
    text: "Pignito",
    sock: {
      sendMessage: async () => {
        sockCalls += 1;
      },
    },
  });

  assert.equal(sockCalls, 0);
  assert.equal(replyPayload.embeds[0].data.title, "✦ Welcome to AIDORU");
  assert.match(replyPayload.embeds[0].data.description, /Already have a WhatsApp trainer\? Link it\./);
  assert.deepEqual(
    replyPayload.components[0].components.map((button) => button.data.label),
    ["Link", "Register"],
  );
  assert.equal(
    replyPayload.components[0].components[0].data.url,
    "https://aidoru.zone.id",
  );
  assert.equal(
    replyPayload.components[0].components[1].data.url,
    "https://aidoru.zone.id",
  );
});