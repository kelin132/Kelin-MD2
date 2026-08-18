import { Col } from "../plugins/cards/db.js";
import { getUser as getEconomyUser } from "../plugins/economy/database.js";
import { formatAnimeLeaderboard } from "./animeLeaderboard.mjs";

const RANK_BADGES = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveName(user) {
  const fallback = String(user.username || user.name || user.userId || "Unknown").trim() || "Unknown";
  const jid = user.whatsappNumber || `${user.userId}@s.whatsapp.net`;
  try {
    const economyUser = await getEconomyUser(jid);
    if (economyUser?.registered && economyUser.name?.trim()) return economyUser.name.trim();
  } catch { /* keep the card profile fallback */ }
  return fallback;
}

export async function getCardLeaderboard(seriesQuery = "") {
  const col = await Col.users();
  const users = await col.find({}).toArray();
  const allSeries = new Map();

  for (const user of users) {
    for (const card of Array.isArray(user.cards) ? user.cards : []) {
      const label = String(card.series || "Unknown").trim() || "Unknown";
      allSeries.set(normalize(label), label);
    }
  }

  let seriesLabel = "";
  if (seriesQuery) {
    const query = normalize(seriesQuery);
    seriesLabel = allSeries.get(query) || [...allSeries.entries()]
      .find(([key]) => key.includes(query) || query.includes(key))?.[1] || seriesQuery.trim();
  }

  const rows = users.map((user) => {
    const cards = Array.isArray(user.cards) ? user.cards : [];
    const matching = seriesLabel
      ? cards.filter((card) => normalize(card.series || "Unknown") === normalize(seriesLabel))
      : cards;
    return {
      user,
      total: matching.length,
      name: "",
    };
  }).filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || String(a.user.userId || "").localeCompare(String(b.user.userId || "")))
    .slice(0, 10);

  const namedRows = await Promise.all(rows.map(async (row) => ({
    ...row,
    name: await resolveName(row.user),
  })));

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
