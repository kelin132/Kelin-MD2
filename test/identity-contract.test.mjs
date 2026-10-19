import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryDb } from "./support/memoryMongo.mjs";
import { resolveAccountIdentity, collectionOwnershipQuery } from "../lib/accountIdentity.mjs";

const phone = "263771234567@s.whatsapp.net", lid = "263779999999@lid";
const other = "263779999999@s.whatsapp.net", discord = "discord:123456789012345678";
function fixture() {
  return createMemoryDb({
    users: [
      { _id: phone, registered: true, money: 30000 },
      { _id: lid, registered: true, money: 7654, websiteId: "AID-EXISTING" },
      { _id: other, registered: true, money: 6543 },
      { _id: discord, registered: true, money: 999 },
    ],
    identity_links: [{ _id: lid, phoneId: phone, source: "baileys" }],
    account_links: [{ whatsappId: phone, discordId: discord.slice(8), status: "active" }],
    mn_users: [
      { _id: "old", userId: "263779999999", whatsappNumber: lid, cards: ["legacy"] },
      { _id: "other", userId: 263779999999, whatsappNumber: phone, identityAliases: [lid, phone], cards: ["other"] },
      { _id: "dc", userId: discord, cards: ["discord"] },
    ],
  });
}
test("every alias selects the same existing website wallet, not a new registered placeholder", async () => {
  const db = fixture();
  for (const id of [phone, lid, discord]) {
    const identity = await resolveAccountIdentity(db, id);
    assert.equal(identity.accountId, lid);
    assert.equal(identity.account.money, 7654);
    assert.equal(identity.ids.includes("263779999999"), false);
  }
});
test("legacy numeric LID cards recover only with original full-LID evidence", async () => {
  const db = fixture();
  for (const id of [phone, lid, discord]) {
    const { ids } = await resolveAccountIdentity(db, id);
    const rows = await db.collection("mn_users").find(collectionOwnershipQuery(ids, ["_id", "userId"])).toArray();
    assert.deepEqual(rows.map(row => row._id).sort(), ["dc", "old"]);
  }
  const { ids } = await resolveAccountIdentity(db, other);
  const own = await db.collection("mn_users").find(collectionOwnershipQuery(ids, ["_id", "userId"])).toArray();
  assert.deepEqual(own.map(row => row._id), ["other"]);
});
test("verified mapping still finds collection ownership with no economy profile", async () => {
  const db = fixture();
  db.data.users = [];
  const { ids, account } = await resolveAccountIdentity(db, phone);
  assert.equal(account, null);
  assert.ok(ids.includes(lid));
});
