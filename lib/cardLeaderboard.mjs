import { Col } from "../plugins/cards/db.js";
import { getDb } from "./mongo.mjs";
import { normalizeJid } from "./identity.mjs";
import { formatAnimeLeaderboard } from "./animeLeaderboard.mjs";

const RANK_BADGES = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function economyJid(user) {
  const raw = String(user.whatsappNumber || user.userId || "").trim();
  if (!raw) return "";
  return normalizeJid(raw.includes("@") ? raw : `${raw}@s.whatsapp.net`);
}

export async function getCardLeaderboard(seriesQuery = "") {
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

  const pipeline = [
    { $match: { cards: { $exists: true, $type: "array", $ne: [] } } },
  ];
  if (seriesLabel) {
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
  } else {
    pipeline.push({ $project: { userId: 1, username: 1, whatsappNumber: 1, cards: 1 } });
  }
  pipeline.push(
    { $project: { userId: 1, username: 1, whatsappNumber: 1, total: { $size: "$cards" } } },
    { $match: { total: { $gt: 0 } } },
    { $sort: { total: -1, userId: 1 } },
    { $limit: 10 },
  );

  const users = await col.aggregate(pipeline).toArray();
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
    total: user.total,
    name: economyNames.get(economyJid(user))
      || String(user.username || user.userId || "Unknown").trim()
      || "Unknown",
  }));

  return { rows: namedRows, seriesLabel };
}

export function formatCardLeaderboard({ rows, seriesLabel = "" }) {
  return formatAnimeLeaderboard({
    title: seriesLabel ? "LEADERBOARD" : "LEADERBOARD",
    subtitle: seriesLabel ? `𝐒𝐄𝐑𝐈𝐄𝐒 · ${seriesLabel.toUpperCase()}` : "ANIME CARD LEADERBOARD",
    rows: rows.map((row) => ({ name: row.name, value: row.total })),
    valueIcon: "🃏",
    valueLabel: "𝐂𝐀𝐑𝐃𝐒",
    footer: seriesLabel ? `🌸 𝐒𝐄𝐑𝐈𝐄𝐒 · ${seriesLabel.toUpperCase()} 𝐋𝐄𝐆𝐄𝐍𝐃𝐒` : "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
  });
}
