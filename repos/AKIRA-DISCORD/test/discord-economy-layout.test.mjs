import test from "node:test";
import assert from "node:assert/strict";
import { sendEconomyReply } from "../lib/discordEconomyReply.mjs";

test("Discord economy replies use the shared AIDORU embed layout", async () => {
  let sent;
  const sock = {
    sendMessage: async (...args) => {
      sent = args;
      return args[1];
    },
  };

  await sendEconomyReply({
    sock,
    jid: "channel-1",
    msg: { key: { id: "message-1" } },
    discord: { message: {} },
    title: "⛏️ Digging",
    text: "You found treasure.",
    color: "#57B894",
    fields: [{ name: "Wallet", value: "$100K", inline: true }],
  });

  assert.equal(sent[1].discordEmbed.title, "⛏️ Digging");
  assert.equal(sent[1].discordEmbed.description, "You found treasure.");
  assert.equal(sent[1].discordEmbed.color, "#57B894");
  assert.deepEqual(sent[1].discordEmbed.fields, [
    { name: "Wallet", value: "$100K", inline: true },
  ]);
  assert.equal(sent[1].discordEmbed.footer.text, "AIDORU • Economy");
});