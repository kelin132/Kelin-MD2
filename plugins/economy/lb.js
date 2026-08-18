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
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const WEALTH_RANKS = ["𝟏", "𝟐", "𝟑", "𝟒", "𝟓", "𝟔", "𝟕", "𝟖", "𝟗", "𝟏𝟎"];
const WEALTH_TIERS = [
  ["⚡", "Legendary Hero"], ["🌸", "Elite Warrior"], ["🗡️", "Grand Swordsman"],
  ["✨", "Skilled Fighter"], ["🌙", "Rising Star"], ["🎴", "Card Master"],
  ["🔥", "Flame Bearer"], ["💧", "Tide Turner"], ["🌿", "Forest Spirit"], ["⭐", "Chosen One"],
];
const WEALTH_SEPARATOR = "  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈";
const formatMoney = (value) => `$${Number(value || 0).toLocaleString()}`;
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

export default {
  name: "lb",
  description: "Leaderboard — top cards or top Pokémon collectors",
  category: "economy",
  usage: ".lb --cards | .lb --pokemon",
  aliases: ["kb", "leaderboard"],
  cooldown: 8,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Normalise: support --flag, -flag, and plain word
    const flag = (args[0] || "").toLowerCase().replace(/^-+/, "");

    const db = await getDb();

    // ── Default: wealth leaderboard (kept inline so deployed containers do not
    // depend on a separate leaderboard.js file that may not exist). ─────────
    if (!flag) {
      const { getAllUsers } = await import("./database.js");
      const users = (await getAllUsers())
        .filter((user) => user?.registered !== false)
        .map((user) => ({
          ...user,
          totalWealth: Number(user.money || 0) + Number(user.bank || 0),
        }))
        .sort((a, b) => b.totalWealth - a.totalWealth)
        .slice(0, 10);

      if (!users.length) {
        return sock.sendMessage(jid, { text: "💰 No registered players yet!" }, { quoted: msg });
      }

      const userJids = users.map((user) => String(user._id || user.jid || user.whatsappNumber || "")).filter(Boolean);
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
      const text = formatWealthLeaderboard(users, cardCounts, pokemonCounts, companies);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP LEVELS ────────────────────────────────────────────────────────────
    if (flag === "level" || flag === "levels" || flag === "xp") {
      const { getAllUsers } = await import("./database.js");
      const users = (await getAllUsers())
        .sort((a, b) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0))
        .slice(0, 10);

      if (!users.length) {
        return sock.sendMessage(jid, { text: "⭐ No registered players yet!" }, { quoted: msg });
      }

      const text = formatAnimeLeaderboard({
        subtitle: "LEVEL LEADERBOARD",
        rows: users.map((user) => ({ name: user.name || "User", value: user.level || 1 })),
        valueIcon: "⭐",
        valueLabel: "𝐋𝐄𝐕𝐄𝐋",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP CARDS ──────────────────────────────────────────────────────────────
    if (flag === "cards" || flag === "card") {
      // mn_users stores cards as an array; aggregate by size
      const results = await db.collection("mn_users").aggregate([
        { $match: { cards: { $exists: true, $type: "array", $ne: [] } } },
        { $project: { userId: 1, cardCount: { $size: "$cards" } } },
        { $sort: { cardCount: -1 } },
        { $limit: 10 },
      ]).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, {
          text: "🃏 No cards collected yet!\nUse the card game commands to start collecting.",
        }, { quoted: msg });
      }

      // Pull full mn_users docs to get whatsappNumber (full JID) and username
      const userIds = results.map(r => r.userId).filter(Boolean);
      const mnDocs  = await db.collection("mn_users")
        .find({ userId: { $in: userIds } }, { projection: { userId: 1, username: 1, whatsappNumber: 1 } })
        .toArray();

      // userId → whatsappNumber (full JID)
      const jidMap = {};
      for (const doc of mnDocs) {
        if (doc.whatsappNumber) jidMap[doc.userId] = doc.whatsappNumber;
      }

      // Collect all known JIDs and look them up in the economy users collection
      const allJids = Object.values(jidMap).filter(Boolean);
      const econDocs = allJids.length
        ? await db.collection("users")
            .find({ _id: { $in: allJids } }, { projection: { _id: 1, name: 1 } })
            .toArray()
        : [];

      // Build lookup: JID → name
      const econNameMap = {};
      for (const u of econDocs) econNameMap[u._id] = u.name || null;

      // Final name resolver: economy name via JID → cards username → fallback
      const mnNameMap = {};
      for (const doc of mnDocs) {
        const econName = econNameMap[doc.whatsappNumber] || null;
        mnNameMap[doc.userId] = econName || doc.username || null;
      }

      const text = formatAnimeLeaderboard({
        subtitle: "ANIME CARD LEADERBOARD",
        rows: results.map((r) => ({ name: mnNameMap[r.userId] || `User_${String(r.userId).slice(-4)}`, value: r.cardCount })),
        valueIcon: "🃏",
        valueLabel: "𝐂𝐀𝐑𝐃𝐒",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── TOP POKÉMON ────────────────────────────────────────────────────────────
    if (flag === "pokemon" || flag === "poke" || flag === "pokémon") {
      const results = await db.collection("pokemon_owned").aggregate([
        { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, {
          text: "🎮 No Pokémon caught yet!\nUse *.spawnpoke* then *.catch* to start your collection.",
        }, { quoted: msg });
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

      const text = formatAnimeLeaderboard({
        subtitle: "POKÉMON LEADERBOARD",
        rows: results.map((r) => {
          const num = (r._id || "").split("@")[0].split(":")[0];
          return { name: nameMap[r._id] || `Trainer_${num.slice(-4)}`, value: r.total };
        }),
        valueIcon: "🎮",
        valueLabel: "𝐏𝐎𝐊𝐄́𝐌𝐎𝐍",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
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
