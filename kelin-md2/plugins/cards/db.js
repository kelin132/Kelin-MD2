/**
 * KELIN MD — Cards system database helpers
 * Collections: mn_users, mn_cards, mn_card_market, mn_spawn_settings
 */
import { getDb } from "../../lib/mongo.mjs";
import { getSeriesForCard } from "../../lib/seriesEnrich.mjs";
import { log } from "../../lib/logger.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function uid(sender) {
  return (sender ?? "").split("@")[0].split(":")[0];
}

export function tag(jid) {
  return `@${uid(jid)}`;
}

export function fmt(n) {
  return Number(n || 0).toLocaleString();
}

// ── Collections ───────────────────────────────────────────────────────────────
// Each method is async — always await the call before chaining .find()/.insertOne() etc.
// Usage: const col = await Col.users();  await col.findOne(...)

export const Col = {
  users:  async () => (await getDb()).collection("mn_users"),
  cards:  async () => (await getDb()).collection("mn_cards"),
  market: async () => (await getDb()).collection("mn_card_market"),
  spawns: async () => (await getDb()).collection("mn_spawn_settings"),
};

// ── User helpers ──────────────────────────────────────────────────────────────

/**
 * Find or create a user. Returns the document with a save() method attached.
 */
export async function findOrCreateUser(sender) {
  const col    = await Col.users();
  const userId = uid(sender);

  let user = await col.findOne({ userId });
  if (!user) {
    user = {
      userId,
      whatsappNumber: sender,
      balance:    0,
      cards:      [],
      cardLimit:  Infinity,
      totalCards: 0,
      username:   null,
      createdAt:  new Date(),
    };
    const { insertedId } = await col.insertOne(user);
    user._id = insertedId;
  }

  user.markModified = () => {}; // no-op — raw driver doesn't need it
  user.save = async () => {
    const c = await Col.users();
    const { _id, save, markModified, ...data } = user;
    await c.updateOne({ userId }, { $set: data });
  };

  return user;
}

/**
 * Find a user without creating one. Returns null if not found.
 */
export async function getUser(sender) {
  const col    = await Col.users();
  const userId = uid(sender);
  const user   = await col.findOne({ userId });
  if (!user) return null;

  user.markModified = () => {};
  user.save = async () => {
    const c = await Col.users();
    const { _id, save, markModified, ...data } = user;
    await c.updateOne({ userId }, { $set: data });
  };
  return user;
}

function needsSeriesRepair(card) {
  const value = String(card?.series || "").trim();
  return !value || value.toLowerCase() === "unknown";
}

/**
 * Repair saved card objects that were created while series enrichment was
 * timing out. Updates are persisted per user so the corrected value is
 * immediately visible to collection, card-info, series, and trading commands.
 */
export async function repairUnknownCardSeries() {
  const col = await Col.users();
  const users = await col.find(
    {
      cards: {
        $elemMatch: {
          $or: [
            { series: { $exists: false } },
            { series: null },
            { series: "" },
            { series: "Unknown" },
          ],
        },
      },
    },
    { projection: { _id: 1, userId: 1, cards: 1 } }
  ).toArray();

  let repairedUsers = 0;
  let repairedCards = 0;
  const resolvedByCard = new Map();

  for (const user of users) {
    if (!Array.isArray(user.cards)) continue;
    let changed = false;

    for (const card of user.cards) {
      if (!needsSeriesRepair(card)) continue;

      const key = `${String(card.name || "").toLowerCase().trim()}|${String(card.media || "")}`;
      let series = resolvedByCard.get(key);
      if (series === undefined) {
        series = await getSeriesForCard(card, { timeout: 12000 });
        resolvedByCard.set(key, series);
      }

      if (series && series !== "Unknown") {
        card.series = series;
        changed = true;
        repairedCards++;
      }
    }

    if (changed) {
      await col.updateOne({ _id: user._id }, { $set: { cards: user.cards } });
      repairedUsers++;
    }
  }

  log(
    "info",
    `[migration] Card series repair finished: ${repairedCards} card(s) across ${repairedUsers} user(s)`
  );
  return { repairedUsers, repairedCards, checkedUsers: users.length };
}

// ── Spawn settings (used by cardspawn.js + autoSpawn.js) ─────────────────────

export async function isSpawnEnabled(chatId) {
  const col = await Col.spawns();
  const doc = await col.findOne({ chatId });
  return doc?.enabled === true;
}

export async function setSpawnEnabled(chatId, enabled) {
  const col = await Col.spawns();
  await col.updateOne(
    { chatId },
    { $set: { chatId, enabled } },
    { upsert: true }
  );
}

export async function getEnabledSpawnChats() {
  const col  = await Col.spawns();
  const docs = await col.find({ enabled: true }).toArray();
  return docs.map(d => d.chatId);
}
