/**
 * KELIN MD — .leaderboard
 * Top 10 players sorted by net worth, showing money, cards, Pokémon & company.
 */
import { getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const MEDALS = ["🥇", "🥈", "🥉"];

export default {
  name: "leaderboard",
  description: "View the top 10 richest players",
  category: "economy",
  usage: ".leaderboard",
  aliases: ["rich", "top"],
  cooldown: 10,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    const users = await getAllUsers();

    if (!users || users.length === 0) {
      return sock.sendMessage(jid, {
        text: "💰 No registered players yet! Be the first with *.register*",
      }, { quoted: msg });
    }

    // Sort by net worth (wallet + bank), highest first — top 10
    const sorted = users
      .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 10);

    // ── Bulk-fetch cards, pokémon & company data ──────────────────────────────
    const db = await getDb();

    const userIds = sorted.map(u =>
      (u._id || "").split("@")[0].split(":")[0]
    ).filter(Boolean);

    const ownerJids = sorted.map(u => u._id).filter(Boolean);

    const [cardDocs, pokeCounts, companyDocs] = await Promise.all([
      db.collection("mn_users")
        .find({ userId: { $in: userIds } }, { projection: { userId: 1, cards: 1 } })
        .toArray(),
      db.collection("pokemon_owned").aggregate([
        { $match: { ownerJid: { $in: ownerJids } } },
        { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
      ]).toArray(),
      db.collection("companies")
        .find({ ownerId: { $in: ownerJids } }, { projection: { ownerId: 1, name: 1, tierEmoji: 1 } })
        .toArray(),
    ]);

    const cardMap = {};
    for (const doc of cardDocs) {
      cardMap[doc.userId] = Array.isArray(doc.cards) ? doc.cards.length : 0;
    }

    const pokeMap = {};
    for (const doc of pokeCounts) pokeMap[doc._id] = doc.total;

    const companyMap = {};
    for (const doc of companyDocs) companyMap[doc.ownerId] = doc;

    // ── Build message ─────────────────────────────────────────────────────────
    let text = `꧁━━〔 🏆 *L E A D E R B O A R D* 〕━━꧂\n\n`;
    text += `  🌸 *Top 10 Richest Players*\n`;
    text += `  ━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (let i = 0; i < sorted.length; i++) {
      const u         = sorted[i];
      const userId    = (u._id || "").split("@")[0].split(":")[0];
      const medal     = MEDALS[i] || `  *${i + 1}.*`;
      const name      = u.name || `User_${userId.slice(-4)}`;
      const cards     = cardMap[userId] || 0;
      const poke      = pokeMap[u._id]  || 0;
      const company   = companyMap[u._id];

      text += `${medal} *${name}*\n`;
      text += `    💰 *$${u.net.toLocaleString()}*\n`;
      text += `    🃏 *${cards}* cards  〔 🎮 *${poke}* pkm 〕\n`;
      if (company) {
        text += `    🏢 *${company.name}*\n`;
      }
      text += `\n`;
    }

    text += `꧂━━━━━━━━━━━━━━━━━━━━━━━━꧁`;
    await sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
  },
};
