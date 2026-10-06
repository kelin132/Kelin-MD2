/**
 * KELIN MD — .lb
 * Unified leaderboard command.
 *
 * Usage:
 *   .lb --cards    → Top 10 users by most cards collected
 *   .lb --pokemon  → Top 10 users by most Pokémon caught
 *   .lb --level    → Top 10 users by level
 *   .lb            → Shows usage menu
 */
import { getDb } from "../../lib/mongo.mjs";
import { ensureTotalWealthMigration } from "./database.js";
import { getCachedLeaderboard } from "../../lib/leaderboardCache.mjs";

const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;

function getMedal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
}

async function loadWealthText(db) {
  const users = await db.collection("users").find(
    { registered: true },
    { projection: { _id: 1, name: 1, username: 1, totalWealth: 1 } },
  ).sort({ totalWealth: -1 }).limit(10).toArray();

  if (!users.length) {
    return [
      "ㅤㅤ∘]───❀───[∘",
      "*∘₊✧ WEALTH RANKINGS* ❀",
      "      ∘]───❀───[∘",
      "",
      "━━━━━━━━━━━━━━━",
      "💰 No registered players yet!",
      "━━━━━━━━━━━━━━━",
      "_Earn money to join_",
    ].join("\n");
  }

  const userJids = users
    .map((user) => String(user._id || user.jid || user.whatsappNumber || ""))
    .filter(Boolean);
  const [cardDocs, pokemonDocs, companyDocs] = await Promise.all([
    db.collection("mn_users").find({
      $or: [{ whatsappNumber: { $in: userJids } }, { userId: {$in: userJids } }],
    }, { projection: { userId: 1, whatsappNumber: 1, totalCards: 1, cards: 1 } }).toArray(),
    db.collection("pokemon_owned").aggregate([
      { $match: { ownerJid: {$in: userJids } } },
      { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
    ]).toArray(),
    db.collection("companies").find({ ownerId: { $in: userJids } }, {
      projection: { ownerId: 1, name: 1 },
    }).toArray(),
  ]);
  const cardCounts = new Map();
  for (const doc of cardDocs) {
    const count = Number.isFinite(Number(doc.totalCards))
      ? Number(doc.totalCards)
      : (Array.isArray(doc.cards) ? doc.cards.length : 0);
    for (const key of [doc.whatsappNumber, doc.userId].filter(Boolean)) {
      const normalized = String(key);
      cardCounts.set(normalized, Math.max(cardCounts.get(normalized) || 0, count));
    }
  }
  const pokemonCounts = new Map(pokemonDocs.map((doc) => [String(doc._id), Number(doc.total || 0)]));
  const companies = new Map(companyDocs.map((company) => [String(company.ownerId), company]));

  return formatWealthLeaderboard(users, cardCounts, pokemonCounts, companies);
}

async function getWealthText(db) {
  await ensureTotalWealthMigration(db);
  return getCachedLeaderboard(
    "economy:wealth:v2",
    () => loadWealthText(db),
    { ttlMs: 0, staleWhileRevalidate: false },
  );
}

function formatWealthLeaderboard(users, cardCounts, pokemonCounts, companies) {
  const rows = users.map((user, index) => {
    const userJid = String(user._id || user.jid || user.whatsappNumber || "");
    const name = user.name || user.username || `User_${userJid.slice(-4)}`;
    const cardCount = cardCounts.get(userJid) || 0;
    const pokemonCount = pokemonCounts.get(userJid) || 0;
    const company = companies.get(userJid);
    const medal = getMedal(index);

    const block = [
      `${medal} *${name}*`,
      `💰 Wealth: ${formatMoney(user.totalWealth)}`,
      `🃏 Cards: ${cardCount} · 🎮 Pokémon: ${pokemonCount}`,
    ];
    if (company?.name) block.push(`🏯 Company: ${company.name}`);
    return block.join("\n");
  });

  return [
    "ㅤㅤ∘]───❀───[∘",
    "*∘₊✧ WEALTH RANKINGS* ❀",
    "      ∘]───❀───[∘",
    "",
    "🌸 *Top 10 Richest Warriors*",
    "",
    "━━━━━━━━━━━━━━━",
    rows.join("\n\n"),
    "━━━━━━━━━━━━━━━",
    "_May your wealth grow like the sakura_",
  ].join("\n");
}

function formatCategoryLeaderboard({ title, subtitle, rows, valueIcon, valueLabel, footer }) {
  const visibleRows = rows.slice(0, 10);
  const formattedRows = visibleRows.map((row, index) => {
    const name = String(row.name || "Trainer").trim();
    const value = Number(row.value) || 0;
    const medal = getMedal(index);

    return [
      `${medal} *${name}*`,
      `${valueIcon} ${valueLabel}: ${value.toLocaleString()}`,
    ].join("\n");
  });

  return [
    "ㅤㅤ∘]───❀───[∘",
    `*∘₊✧ ${title.toUpperCase()}* ❀`,
    "      ∘]───❀───[∘",
    "",
    `🌸 *${subtitle}*`,
    "",
    "━━━━━━━━━━━━━━━",
    formattedRows.join("\n\n"),
    "━━━━━━━━━━━━━━━",
    `_${footer}_`,
  ].join("\n");
}

export default {
  name: "lb",
  description: "Leaderboard — top wealth, cards, levels, or Pokémon collectors",
  category: "economy",
  usage: ".lb --cards | .lb --pokemon | .lb --level",
  aliases: ["kb", "leaderboard"],
  cooldown: 8,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Normalise: support --flag, -flag, and plain word
    const flag = (args[0] || "").toLowerCase().replace(/^-+/, "");

    const db = await getDb();

    // ── Default: wealth leaderboard ─────────────────────────────────────────
    if (!flag) {
      const text = await getWealthText(db);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP LEVELS ────────────────────────────────────────────────────────────
    if (flag === "level" || flag === "levels" || flag === "xp") {
      const users = await getCachedLeaderboard(
        "economy:level",
        () => db.collection("users")
          .find(
            { registered: true },
            { projection: { _id: 1, name: 1, level: 1, xp: 1 } },
          )
          .sort({ level: -1, xp: -1, _id: 1 })
          .limit(10)
          .toArray(),
        { ttlMs: 30_000 },
      );

      if (!users.length) {
        return sock.sendMessage(jid, { text: "⭐ No registered players yet!" }, { quoted: msg });
      }

      const text = formatCategoryLeaderboard({
        title: "LEVEL RANKINGS",
        subtitle: "Top 10 Players by Level",
        rows: users.map((user) => ({ name: user.name || "User", value: user.level || 1 })),
        valueIcon: "⭐",
        valueLabel: "Level",
        footer: "Level up and claim your place",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP CARDS ──────────────────────────────────────────────────────────────
    if (flag === "cards" || flag === "card") {
      const text = await getCachedLeaderboard("economy:cards:formatted", async () => {
        let results = await getCachedLeaderboard("economy:cards:raw", () => db.collection("mn_users")
          .find({ totalCards: { $gt: 0 } }, {
            projection: { userId: 1, whatsappNumber: 1, username: 1, totalCards: 1 },
          })
          .sort({ totalCards: -1, userId: 1 })
          .limit(10)
          .toArray(), { ttlMs: 30_000 });
        if (!results.length) {
          results = await getCachedLeaderboard("economy:cards:legacy", () => db.collection("mn_users").aggregate([
            { $match: { cards: {$exists: true, $type: "array", $ne: [] } } },
            { $project: { userId: 1, whatsappNumber: 1, username: 1, cardCount: { $size: "$cards" } } },
            { $sort: { cardCount: -1 } },             {$limit: 10 },
          ]).toArray(), { ttlMs: 30_000 });
        }

        if (!results.length) return "";

        const userIds = results.map(r => r.userId).filter(Boolean);
        const mnDocs = await db.collection("mn_users")
          .find({
            $or: [
              { userId: { $in: userIds } },
              { whatsappNumber: { $in: userIds } },
            ],
          }, { projection: { userId: 1, username: 1, whatsappNumber: 1 } })
          .toArray();

        const jidMap = {};
        for (const doc of mnDocs) {
          if (doc.whatsappNumber) jidMap[doc.userId] = doc.whatsappNumber;
        }

        const allJids = Object.values(jidMap).filter(Boolean);
        const econDocs = allJids.length
          ? await db.collection("users")
              .find({ _id: { $in: allJids } }, { projection: { _id: 1, name: 1 } })
              .toArray()
          : [];

        const econNameMap = {};
        for (const u of econDocs) econNameMap[u._id] = u.name || null;

        const mnNameMap = {};
        for (const doc of mnDocs) {
          const econName = econNameMap[doc.whatsappNumber] || null;
          mnNameMap[doc.userId] = econName || doc.username || null;
        }

        return formatCategoryLeaderboard({
          title: "CARD RANKINGS",
          subtitle: "Top 10 Card Collectors",
          rows: results.map((r) => ({ name: mnNameMap[r.userId] || `User_${String(r.userId).slice(-4)}`, value: r.cardCount ?? r.totalCards })),
          valueIcon: "🃏",
          valueLabel: "Cards",
          footer: "Collect • compete • become a legend",
        });
      }, { ttlMs: 30_000 });

      if (!text) {
        return sock.sendMessage(jid, {
          text: "🃏 No cards collected yet!\nUse the card game commands to start collecting.",
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP POKÉMON ────────────────────────────────────────────────────────────
    if (flag === "pokemon" || flag === "poke" || flag === "pokémon") {
      const text = await getCachedLeaderboard("economy:pokemon:formatted", async () => {
        const trainers = await getCachedLeaderboard(
          "economy:pokemon:raw",
          () => db.collection("pokemon_trainers").find(
            { pokemonCount: { $gt: 0 } },
            { projection: { jid: 1, username: 1, pokemonCount: 1 } },
          ).sort({ pokemonCount: -1, jid: 1 }).limit(10).toArray(),
          { ttlMs: 30_000 },
        );

        if (!trainers.length) return "";

        const ownerJids = trainers.map((trainer) => trainer.jid).filter(Boolean);
        const userDocs = await db.collection("users").find(
          { _id: { $in: ownerJids } },
          { projection: { _id: 1, name: 1 } },
        ).toArray();

        const nameMap = {};
        for (const u of userDocs) nameMap[u._id] = u.name || null;

        return formatCategoryLeaderboard({
          title: "POKÉMON RANKINGS",
          subtitle: "Top 10 Pokémon Trainers",
          rows: trainers.map((trainer) => {
            const ownerId = String(trainer.jid || "");
            const num = ownerId.split("@")[0].split(":")[0];
            return {
              name: nameMap[ownerId] || trainer.username || `Trainer_${num.slice(-4)}`,
              value: trainer.pokemonCount,
            };
          }),
          valueIcon: "🎮",
          valueLabel: "Pokémon",
          footer: "Catch • train • rise to the top",
        });
      }, { ttlMs: 30_000 });

      if (!text) {
        return sock.sendMessage(jid, {
          text: "🎮 No Pokémon caught yet!\nUse *.spawnpoke* then *.catch* to start your collection.",
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // Unknown flag
    return sock.sendMessage(jid, {
      text:
`❌ Unknown option *"${args[0]}"*

*Valid options:*
🃏 *.lb --cards*   — Top card collectors
🎮 *.lb --pokemon* — Top Pokémon trainers
⭐ *.lb --level*   — Top players by level`,
    }, { quoted: msg });
  },
};
