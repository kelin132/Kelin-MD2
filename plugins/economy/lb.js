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

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export default {
  name: "lb",
  description: "Leaderboard — top cards or top Pokémon collectors",
  category: "economy",
  usage: ".lb --cards | .lb --pokemon",
  aliases: ["kb"],
  cooldown: 8,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Normalise: support --flag, -flag, and plain word
    const flag = (args[0] || "").toLowerCase().replace(/^-+/, "");

    const db = await getDb();

    // ── Default: top 10 richest players (economy leaderboard) ────────────────
    if (!flag) {
      const { getAllUsers } = await import("./database.js");
      const users = await getAllUsers();

      if (!users || users.length === 0) {
        return sock.sendMessage(jid, {
          text: "💰 No registered players yet! Be the first with *.register*",
        }, { quoted: msg });
      }

      const sorted = users
        .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 10);

      const userIds  = sorted.map(u => (u._id || "").split("@")[0].split(":")[0]).filter(Boolean);
      const ownerJids = sorted.map(u => u._id).filter(Boolean);

      const [cardDocs, pokeCounts] = await Promise.all([
        db.collection("mn_users")
          .find({ userId: { $in: userIds } }, { projection: { userId: 1, cards: 1 } })
          .toArray(),
        db.collection("pokemon_owned").aggregate([
          { $match: { ownerJid: { $in: ownerJids } } },
          { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
        ]).toArray(),
      ]);

      const cardMap = {};
      for (const doc of cardDocs) cardMap[doc.userId] = Array.isArray(doc.cards) ? doc.cards.length : 0;
      const pokeMap = {};
      for (const doc of pokeCounts) pokeMap[doc._id] = doc.total;

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

      text += `━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🃏 *.lb --cards* | 🎮 *.lb --pokemon* | ⭐ *.lb --level*`;

      return sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
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

      let text = "⭐ *LEVEL LEADERBOARD — TOP 10*\n";
      text += "━".repeat(28) + "\n\n";
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const medal = MEDALS[i] || `${i + 1}.`;
        const xp = user.xp || 0;
        const nextLevelXp = (user.level || 1) * 1000;
        text += `${medal} *${user.name || "User"}*\n`;
        text += `   ⭐ Level ${user.level || 1} • ${xp.toLocaleString()} XP\n`;
        text += `   📈 ${Math.max(0, nextLevelXp - xp).toLocaleString()} XP to next level\n\n`;
      }
      return sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
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

      let text = "🃏 *TOP CARD COLLECTORS*\n";
      text += "━".repeat(28) + "\n\n";

      for (let i = 0; i < results.length; i++) {
        const r      = results[i];
        const medal  = MEDALS[i] || `${i + 1}.`;
        const name   = mnNameMap[r.userId] || `User_${String(r.userId).slice(-4)}`;
        text += `${medal} *${name}*\n`;
        text += `   🃏 Cards: ${r.cardCount}\n\n`;
      }

      return sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
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

      let text = "🎮 *TOP POKÉMON TRAINERS*\n";
      text += "━".repeat(28) + "\n\n";

      for (let i = 0; i < results.length; i++) {
        const r     = results[i];
        const medal = MEDALS[i] || `${i + 1}.`;
        const num   = (r._id || "").split("@")[0].split(":")[0];
        const name  = nameMap[r._id] || `Trainer_${num.slice(-4)}`;
        text += `${medal} *${name}*\n`;
        text += `   🎮 Pokémon: ${r.total}\n\n`;
      }

      return sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
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
