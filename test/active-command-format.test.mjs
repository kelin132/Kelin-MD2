import test from "node:test";
import assert from "node:assert/strict";
import { decodeActivityJid, resolveActiveChatters } from "../plugins/group/active.js";

test("active decodes stored LID and phone IDs before mentioning members", () => {
  const storedLid = "jid_Mjc2NTgzNzEzNjExODA4QGxpZA";
  const storedPhone = "jid_MjM0OTE2ODgwODQ0MEBzLndoYXRzYXBwLm5ldA";
  assert.equal(decodeActivityJid(storedLid), "276583713611808@lid");
  assert.equal(decodeActivityJid(storedPhone), "2349168808440@s.whatsapp.net");

  const rows = resolveActiveChatters(
    [[storedLid, 22552], [storedPhone, 16501]],
    { participants: [
      { id: "276583713611808@lid", notify: "Kelin" },
      { id: "2349168808440@s.whatsapp.net", notify: "Mina" },
    ] },
  );
  assert.deepEqual(rows.map((row) => row.jid), [
    "276583713611808@lid",
    "2349168808440@s.whatsapp.net",
  ]);
  assert.match(rows[0].label, /Kelin/);
  assert.match(rows[1].label, /Mina/);
  assert.equal(rows[0].count, 22552);
});

test("active does not expose undecodable jid_ storage keys", () => {
  assert.equal(decodeActivityJid("jid_not-valid"), "");
});
