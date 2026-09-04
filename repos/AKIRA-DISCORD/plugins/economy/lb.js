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
import { getCachedLeaderboard } from "../../lib/leaderboardCache.mjs";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const WEALTH_RANKS = ["𝟏", "𝟐", "𝟑", "𝟒", "𝟓", "𝟔", "𝟕", "𝟖", "𝟗", "𝟏𝟎"];
const WEALTH_TIERS = [
  ["⚡", "Legendary Hero"], ["🌸", "Elite Warrior"], ["🗡️", "Grand Swordsman"],
  ["✨", "Skilled Fighter"], ["🌙", "Rising Star"], ["🎴", "Card Master"],
  ["🔥", "Flame Bearer"], ["💧", "Tide Turner"], ["🌿", "Forest Spirit"], ["⭐", "Chosen One"],
];
const WEALTH_SEPARATOR = "  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
const WEALTH_CACHE_TTL_MS = 15_000;
const CATEGORY_CACHE_TTL_MS = 15_000;
let wealthCache = null;
let wealthRefresh = null;
const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
const numericField = (field) => ({
  $convert: { input: { $ifNull: [field, 0] }, to: "double", onError: 0, onNull: 0 },
});

function getCachedCategory(key, loader) {
  return getCachedLeaderboard(`discord:lb:${key}`, loader, CATEGORY_CACHE_TTL_MS);
}

async function refreshWealthText(db) {
  // Share one refresh when several groups request .lb together. Without this,
  // each simultaneous command repeats the full users sort and enrichment reads.
  if (!wealthRefresh) {
    wealthRefresh = (async () => {
      const users = await db.collection("users").aggregate([
        { $match: { registered: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            totalWealth: { $add: [numericField("$money"), numericField("$bank")] },
          },
        },
        { $sort: { totalWealth: -1, _id: 1 } },
        { $limit: 10 },
      ]).toArray();

      if (!users.length) return "💰 No registered players yet!";

      const userJids = users
        .map((user) => String(user._id || user.jid || user.whatsappNumber || ""))
        .filter(Boolean);
      const [cardDocs, pokemonDocs, companyDocs] = await Promise.all([
        db.collection("mn_users").find({
          $or: [{ whatsappNumber: { $in: userJids } }, { userId: { $in: userJids } }],
        }, { projection: { userId: 1, whatsappNumber: 1, cards: 1 } }).toArray(),
        db.collection("pokemon_owned").aggregate([
          { $match: { ownerJid: { $in: userJids } } },
          { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
        ]).toArray(),
        db.collection("companies").find({ ownerId: { $in: userJids } }, {
          projection: { ownerId: 1, name: 1 },
        }).toArray(),
      ]);
      const cardCounts = new Map();
      for (const doc of cardDocs) {
        const count = Array.isArray(doc.cards) ? doc.cards.length : 0;
        for (const key of [doc.whatsappNumber, doc.userId].filter(Boolean)) {
          const normalized = String(key);
          cardCounts.set(normalized, Math.max(cardCounts.get(normalized) || 0, count));
        }
      }
      const pokemonCounts = new Map(pokemonDocs.map((doc) => [String(doc._id), Number(doc.total || 0)]));
      const companies = new Map(companyDocs.map((company) => [String(company.ownerId), company]));
      return formatWealthLeaderboard(users, cardCounts, pokemonCounts, companies);
    })();
  }

  try {
    const text = await wealthRefresh;
    wealthCache = { createdAt: Date.now(), text };
    return text;
  } finally {
    wealthRefresh = null;
  }
}

async function getWealthText(db) {
  if (wealthCache) {
    if (Date.now() - wealthCache.createdAt < WEALTH_CACHE_TTL_MS) {
      return wealthCache.text;
    }

    // Serve the last complete snapshot while the next one refreshes.
    void refreshWealthText(db).catch(() => {});
    return wealthCache.text;
  }

  return refreshWealthText(db);
}

function formatWealthLeaderboard(users, cardCounts, pokemonCounts, companies) {
  const lines = [
    "⛩️  *𝗪𝗘𝗔𝗟𝗧𝗛  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦* ⛩️",
    "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
    "  🌸 *Top 10 Richest Warriors*",
    "  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦",
    "",
  ];
  users.forEach((user, index) => {
    const userJid = String(user._id || user.jid || user.whatsappNumber || "");
    const [tierIcon, tierName] = WEALTH_TIERS[index] || ["⭐", "Chosen One"];
    const name = user.name || user.username || `User_${userJid.slice(-4)}`;
    const cardCount = cardCounts.get(userJid) || 0;
    const pokemonCount = pokemonCounts.get(userJid) || 0;
    const company = companies.get(userJid);
    lines.push(`『 ${WEALTH_RANKS[index] || String(index + 1)} 』 *${name}*`);
    lines.push(`  ┗ ${tierIcon} ${tierName}`);
    lines.push(`  💰 *${formatMoney(user.totalWealth)}*  🃏 *${cardCount}* cards  🎮 *${pokemonCount}* pkm`);
    if (company?.name) lines.push(`  🏯 *${company.name}*`);
    if (index < users.length - 1) lines.push(WEALTH_SEPARATOR);
  });
  lines.push("", "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦", "🌺 _May your wealth grow like the sakura_");
  return lines.join("\n");
}

function formatCategoryLeaderboard({ heading, subtitle, rows, valueIcon, valueLabel, footer }) {
  const visibleRows = rows.slice(0, 10);
  const lines = [
    `╭━━━━━━〔 🎴 *${heading.toUpperCase()}* 〕━━━━━━╮`,
    "│",
    `│       ✦ *${subtitle.toUpperCase()}* ✦`,
    "│             ───── ୨୧ ─────",
    "│",
  ];
  visibleRows.forEach((row, index) => {
    const name = String(row.name || "Trainer").trim().toUpperCase();
    const value = Number(row.value) || 0;
    const medal = MEDALS[index] || `(${index + 1})`;
    lines.push(`│ ${medal} *${name}*`);
    lines.push(`│    ╰─ ${valueIcon} *${value.toLocaleString()} ${valueLabel}*`);
    lines.push("│");
  });
  lines.push(
    `│       🌸 ✦ ${footer || "COLLECT • COMPETE"} ✦ 🌸`,
    "│",
    `╰━━━━━━〔 🌸 *${heading.toUpperCase()}* 〕━━━━━━╯`
  );
  return lines.join("\n");
}

export default {
  name: "lb",
  description: "Leaderboard — top cards or top Pokémon collectors",
  category: "economy",
  usage: ".lb --cards | .lb --pokemon",
  aliases: ["kb", "leaderboard"],
  discordColor: "#F1C40F",
  discordTitle: "🏆 Leaderboard",
  cooldown: 8,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Normalise: support --flag, -flag, and plain word
    const flag = (args[0] || "").toLowerCase().replace(/^-+/, "");

    const db = await getDb();
    const usersCollection = db.collection("users");

    // ── Default: wealth leaderboard ─────────────────────────────────────────
    if (!flag) {
      const text = await getWealthText(db);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP LEVELS ────────────────────────────────────────────────────────────
    if (flag === "level" || flag === "levels" || flag === "xp") {
      const text = await getCachedCategory("level", async () => {
        const users = await usersCollection.aggregate([
          { $match: { registered: true } },
          {
            $project: {
              name: 1,
              level: numericField("$level"),
              xp: numericField("$xp"),
            },
          },
          { $sort: { level: -1, xp: -1, _id: 1 } },
          { $limit: 10 },
        ]).toArray();

        if (!users.length) return "⭐ No registered players yet!";

        return formatCategoryLeaderboard({
          heading: "LEVEL RANKINGS",
          subtitle: "Top 10 Players by Level",
          rows: users.map((user) => ({ name: user.name || "User", value: user.level || 1 })),
          valueIcon: "⭐",
          valueLabel: "LEVEL",
          footer: "Level up and claim your place",
        });
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP CARDS ──────────────────────────────────────────────────────────────
    if (flag === "cards" || flag === "card") {
      const text = await getCachedCategory("cards", async () => {
        // mn_users stores cards as an array; aggregate by size
        const results = await db.collection("mn_users").aggregate([
          { $match: { cards: { $exists: true, $type: "array", $ne: [] } } },
          { $project: { userId: 1, whatsappNumber: 1, username: 1, cardCount: { $size: "$cards" } } },
          { $sort: { cardCount: -1, userId: 1 } },
          { $limit: 10 },
        ]).toArray();

        if (!results.length) {
          return "🃏 No cards collected yet!\nUse the card game commands to start collecting.";
        }

        const allJids = results.map((result) => result.whatsappNumber).filter(Boolean);
        const econDocs = allJids.length
          ? await usersCollection
              .find({ _id: { $in: allJids } }, { projection: { _id: 1, name: 1 } })
              .toArray()
          : [];

        const econNameMap = new Map(econDocs.map((user) => [String(user._id), user.name || null]));

        return formatCategoryLeaderboard({
          heading: "CARD RANKINGS",
          subtitle: "Top 10 Card Collectors",
          rows: results.map((result) => ({
            name: econNameMap.get(String(result.whatsappNumber))
              || result.username
              || `User_${String(result.userId || "").slice(-4)}`,
            value: result.cardCount,
          })),
          valueIcon: "🃏",
          valueLabel: "CARDS",
          footer: "Collect • compete • become a legend",
        });
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP POKÉMON ────────────────────────────────────────────────────────────
    if (flag === "pokemon" || flag === "poke" || flag === "pokémon") {
      const text = await getCachedCategory("pokemon", async () => {
        const results = await db.collection("pokemon_owned").aggregate([
          { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: 10 },
        ]).toArray();

        if (!results.length) {
          return "🎮 No Pokémon caught yet!\nUse *.spawnpoke* then *.catch* to start your collection.";
        }

        // Resolve trainer names from pokemon_trainers, fall back to users collection
        const ownerJids = results.map(r => r._id).filter(Boolean);

        const [trainerDocs, userDocs] = await Promise.all([
          db.collection("pokemon_trainers").find(
            { jid: { $in: ownerJids } },
            { projection: { jid: 1, username: 1 } }
          ).toArray(),
          db.collection("users").find(
            { _id: { $in: ownerJids } },
            { projection: { _id: 1, name: 1 } }
          ).toArray(),
        ]);

        const nameMap = {};
        for (const u of userDocs)    nameMap[u._id]    = u.name     || null;
        for (const t of trainerDocs) nameMap[t.jid]    = t.username || nameMap[t.jid] || null;

        return formatCategoryLeaderboard({
          heading: "POKÉMON RANKINGS",
          subtitle: "Top 10 Pokémon Trainers",
          rows: results.map((r) => {
            const ownerId = String(r._id || "");
            const num = ownerId.split("@")[0].split(":")[0];
            return { name: nameMap[ownerId] || `Trainer_${num.slice(-4)}`, value: r.total };
          }),
          valueIcon: "🎮",
          valueLabel: "POKÉMON",
          footer: "Catch • train • rise to the top",
        });
      });
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
