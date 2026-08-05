/**
 * KELIN MD — .leaderboard
 * Top 10 players sorted by net worth — anime aesthetic theme.
 */
import { getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

const RANK_BADGES = [
  "『 𝟏 』", "『 𝟐 』", "『 𝟑 』",
  "『 𝟒 』", "『 𝟓 』", "『 𝟔 』",
  "『 𝟕 』", "『 𝟖 』", "『 𝟗 』", "『 𝟏𝟎 』",
];

const RANK_TITLES = [
  "⚡ Legendary Hero",    "🌸 Elite Warrior",  "🗡️ Grand Swordsman",
  "✨ Skilled Fighter",   "🌙 Rising Star",     "🎴 Card Master",
  "🔥 Flame Bearer",      "💧 Tide Turner",     "🌿 Forest Spirit",
  "⭐ Chosen One",
];

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

    const sorted = users
      .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 10);

    const db = await getDb();
    const userIds  = sorted.map(u => (u._id || "").split("@")[0].split(":")[0]).filter(Boolean);
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
        .find({ ownerId: { $in: ownerJids } }, { projection: { ownerId: 1, name: 1 } })
        .toArray(),
    ]);

    const cardMap = {};
    for (const doc of cardDocs) cardMap[doc.userId] = Array.isArray(doc.cards) ? doc.cards.length : 0;
    const pokeMap = {};
    for (const doc of pokeCounts) pokeMap[doc._id] = doc.total;
    const companyMap = {};
    for (const doc of companyDocs) companyMap[doc.ownerId] = doc;

    // ── Header ────────────────────────────────────────────────────────────────
    let text = ``;
    text += `⛩️  *𝗪𝗘𝗔𝗟𝗧𝗛  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦* ⛩️\n`;
    text += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
    text += `  🌸 *Top 10 Richest Warriors*\n`;
    text += `  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n\n`;

    for (let i = 0; i < sorted.length; i++) {
      const u       = sorted[i];
      const userId  = (u._id || "").split("@")[0].split(":")[0];
      const name    = u.name || `Warrior_${userId.slice(-4)}`;
      const cards   = cardMap[userId] || 0;
      const poke    = pokeMap[u._id]  || 0;
      const company = companyMap[u._id];
      const badge   = RANK_BADGES[i]  || `『${i + 1}』`;
      const title   = RANK_TITLES[i]  || "⭐ Warrior";

      text += `${badge} *${name}*\n`;
      text += `  ┗ ${title}\n`;
      text += `  💰 *$${u.net.toLocaleString()}*`;
      text += `  🃏 *${cards}* cards  🎮 *${poke}* pkm\n`;
      if (company) text += `  🏯 *${company.name}*\n`;
      text += i < sorted.length - 1 ? `  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n` : ``;
    }

    text += `\n✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n`;
    text += `🌺 _May your wealth grow like the sakura_`;

    await sock.sendMessage(jid, { text: text.trim() }, { quoted: msg });
  },
};
