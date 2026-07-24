/**
 * KELIN MD — .leaderboard
 * Top 10 players sorted by net worth, showing money, cards & Pokémon.
 */
import { getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const MEDALS = ["🥇", "🥈", "🥉"];

export default {
  name: "leaderboard",
  description: "View the top 10 richest players",
  category: "economy",
  usage: ".leaderboard",
  aliases: ["lb", "rich", "top"],
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

    // ── Bulk-fetch cards & pokémon counts ─────────────────────────────────────
    const db = await getDb();

    const userIds = sorted.map(u =>
      (u._id || "").split("@")[0].split(":")[0]
    ).filter(Boolean);

    const cardDocs = await db.collection("mn_users")
      .find({ userId: { $in: userIds } }, { projection: { userId: 1, cards: 1 } })
      .toArray();
    const cardMap = {};
    for (const doc of cardDocs) {
      cardMap[doc.userId] = Array.isArray(doc.cards) ? doc.cards.length : 0;
    }

    const ownerJids = sorted.map(u => u._id).filter(Boolean);
    const pokeCounts = await db.collection("pokemon_owned").aggregate([
      { $match: { ownerJid: { $in: ownerJids } } },
      { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
    ]).toArray();
    const pokeMap = {};
    for (const doc of pokeCounts) pokeMap[doc._id] = doc.total;

    // ── Build message ─────────────────────────────────────────────────────────
    let text = "🏆 *LEADERBOARD — TOP 10*\n";
    text += "━".repeat(28) + "\n\n";

    for (let i = 0; i < sorted.length; i++) {
      const u      = sorted[i];
      const userId = (u._id || "").split("@")[0].split(":")[0];
      const medal  = MEDALS[i] || `${i + 1}.`;
      const name   = u.name || `User_${userId.slice(-4)}`;
      const cards  = cardMap[userId] || 0;
      const poke   = pokeMap[u._id]  || 0;

      text += `${medal} *${name}*\n`;
      text += `   💰 Money: $${u.net.toLocaleString()}\n`;
      text += `   🃏 Cards: ${cards}\n`;
      text += `   🎮 Pokémon: ${poke}\n\n`;
    }

    await sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
  },
};
