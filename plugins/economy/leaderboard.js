/**
 * KELIN MD — .leaderboard
 * Top players with profile block layout, including cards & Pokémon counts.
 */
import { getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

function xpNeeded(level) {
  return level * 1000;
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildProfileBlock(user, rank, cardCount, pokeCount) {
  const level  = user.level || 1;
  const xp     = user.xp   || 0;
  const money  = user.money || 0;
  const bank   = user.bank  || 0;
  const orbs   = user.orbs  || 0;
  const vault  = user.vault || 0;
  const bio    = user.bio   || "No bio set.";
  const guild  = user.guildName || "None";
  const streak = user.streak    || 0;
  const name   = (user.name || "Player").toUpperCase();
  const joined = formatDate(user.registeredAt);
  const xpTarget = xpNeeded(level);

  return (
`┌─〔 👤 PLAYER PROFILE 〕
├◆ 🪪 ${name} (#${rank})
│
├◆ 📝 Bio: ${bio}
├◆ 🏰 Guild: ${guild}
│
├─〔 📊 PROGRESS 〕
│
├◆ 🔰 Level: ${level}
├◆ ⭐ XP: ${xp.toLocaleString()} / ${xpTarget.toLocaleString()}
├◆ 🔥 Streak: ${streak} day${streak !== 1 ? "s" : ""}
│
├─〔 💰 ECONOMY 〕
│
├◆ 💠 Wallet: ${money.toLocaleString()} Xen
├◆ 🏦 Bank: ${bank.toLocaleString()} Xen
├◆ 🌑 Nyx: ${orbs.toLocaleString()}
├◆ 💎 Diamonds: ${vault.toLocaleString()}
│
├─〔 🎴 COLLECTION 〕
│
├◆ 🃏 Cards: ${cardCount}
├◆ 🎮 Pokémon: ${pokeCount}
│
├◆ 📅 Joined: ${joined}
└─────────────◆`
  );
}

export default {
  name: "leaderboard",
  description: "View the top players",
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

    // Sort by net worth (wallet + bank)
    const sorted = users
      .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 5);

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

    // ── Build and send ─────────────────────────────────────────────────────────
    const blocks = [];
    for (let i = 0; i < sorted.length; i++) {
      const u      = sorted[i];
      const userId = (u._id || "").split("@")[0].split(":")[0];
      const cards  = cardMap[userId] || 0;
      const poke   = pokeMap[u._id]  || 0;
      blocks.push(buildProfileBlock(u, i + 1, cards, poke));
    }

    const header = `🏆 *KELIN MD — TOP LEADERBOARD*\n${"━".repeat(30)}\n\n`;
    await sock.sendMessage(jid, { text: header + blocks.join("\n\n") }, { quoted: msg });
  },
};
