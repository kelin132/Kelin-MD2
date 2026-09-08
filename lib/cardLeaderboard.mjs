import { Col } from "../plugins/cards/db.js";
import { getDb } from "./mongo.mjs";
import { normalizeJid } from "./identity.mjs";
import { formatLeaderboard } from "./leaderboardFormat.mjs";
import { getCachedLeaderboard } from "./leaderboardCache.mjs";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function economyJid(user) {
  const raw = String(user.whatsappNumber || user.userId || "").trim();
  if (!raw) return "";
  return normalizeJid(raw.includes("@") ? raw : `${raw}@s.whatsapp.net`);
}

export async function getCardLeaderboard(seriesQuery = "") {
  const cacheKey = normalize(seriesQuery);
  return getCachedLeaderboard(
    `cards:${cacheKey}`,
    () => loadCardLeaderboard(seriesQuery),
    { ttlMs: 60_000 },
  );
}

async function loadCardLeaderboard(seriesQuery = "") {
  const col = await Col.users();
  let seriesLabel = "";
  if (seriesQuery) {
    const query = normalize(seriesQuery);
    const seriesValues = (await col.distinct("cards.series"))
      .map(value => String(value || "").trim())
      .filter(Boolean);
    seriesLabel = seriesValues.find(value => normalize(value) === query)
      || seriesValues.find(value => normalize(value).includes(query) || query.includes(normalize(value)))
      || seriesQuery.trim();
  }

  let users;
  if (seriesLabel) {
    const pipeline = [
      { $match: { cards: { $exists: true, $type: "array", $ne: [] } } },
    ];
    pipeline.push({
      $project: {
        userId: 1,
        username: 1,
        whatsappNumber: 1,
        cards: {
          $filter: {
            input: "$cards",
            as: "card",
            cond: {
              $eq: [
                {
                  $toLower: {
                    $trim: { input: { $ifNull: ["$$card.series", ""] } },
                  },
                },
                normalize(seriesLabel),
              ],
            },
          },
        },
      },
    });
    pipeline.push(
      { $project: { userId: 1, username: 1, whatsappNumber: 1, total: { $size: "$cards" } } },
      { $match: { total: { $gt: 0 } } },
    );
    pipeline.push({ $sort: { total: -1, userId: 1 } }, { $limit: 10 });
    users = await col.aggregate(pipeline).toArray();
  } else {
    // New card users maintain totalCards, allowing the common leaderboard
    // query to use the background index instead of sizing every card array.
    users = await col.find(
      { totalCards: { $gt: 0 } },
      { projection: { userId: 1, username: 1, whatsappNumber: 1, totalCards: 1 } },
    ).sort({ totalCards: -1, userId: 1 }).limit(10).toArray();

    // Keep old installations with only a cards array working. This fallback
    // is only used when the indexed counter has not been populated yet.
    if (!users.length) {
      users = await col.aggregate([
        { $match: { cards: { $exists: true, $type: "array", $ne: [] } } },
        { $project: { userId: 1, username: 1, whatsappNumber: 1, total: { $size: "$cards" } } },
        { $sort: { total: -1, userId: 1 } },
        { $limit: 10 },
      ]).toArray();
    }
  }

  const candidateJids = users.map(economyJid).filter(Boolean);
  const db = await getDb();
  const economyDocs = candidateJids.length
    ? await db.collection("users").find(
      { _id: { $in: candidateJids } },
      { projection: { _id: 1, name: 1 } },
    ).toArray()
    : [];
  const economyNames = new Map(
    economyDocs.map(user => [String(user._id), String(user.name || "").trim()]),
  );
  const namedRows = users.map(user => ({
    user,
    total: user.total ?? user.totalCards,
    name: economyNames.get(economyJid(user))
      || String(user.username || user.userId || "Unknown").trim()
      || "Unknown",
  }));

  return { rows: namedRows, seriesLabel };
}

export function formatCardLeaderboard({ rows, seriesLabel = "" }) {
  return formatLeaderboard({
    subtitle: seriesLabel ? `𝐒𝐄𝐑𝐈𝐄𝐒 · ${seriesLabel.toUpperCase()}` : "ANIME CARD LEADERBOARD",
    rows: rows.map((row) => ({ name: row.name, value: row.total })),
    valueIcon: "🃏",
    valueLabel: "𝐂𝐀𝐑𝐃𝐒",
    footer: seriesLabel ? `𝐒𝐄𝐑𝐈𝐄𝐒 · ${seriesLabel.toUpperCase()} 𝐋𝐄𝐆𝐄𝐍𝐃𝐒` : "𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
  });
}
