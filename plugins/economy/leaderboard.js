/**
 * KELIN MD — .leaderboard
 * Shows top players with full profile blocks including cards & Pokémon counts.
 */
import { getAllUsers } from "./database.js";
import { getDb } from "../../lib/mongo.mjs";

// ── Rank ladder ───────────────────────────────────────────────────────────────
const RANK_LADDER = [
  { name: "Recruit",     emoji: "🎯",  minLevel: 1  },
  { name: "Scout",       emoji: "👁️", minLevel: 5  },
  { name: "Active Unit", emoji: "⚙️",  minLevel: 8  },
  { name: "Operative",   emoji: "🕶️", minLevel: 15 },
  { name: "Agent",       emoji: "🔰",  minLevel: 25 },
  { name: "Specialist",  emoji: "🌟",  minLevel: 35 },
  { name: "Commander",   emoji: "🛡️", minLevel: 50 },
  { name: "Warlord",     emoji: "⚔️",  minLevel: 65 },
  { name: "Elite",       emoji: "💠",  minLevel: 80 },
  { name: "Legend",      emoji: "👑",  minLevel: 100 },
];

// ── Status / prestige titles ───────────────────────────────────────────────────
const PRESTIGE_TITLES = [
  { title: "Xen Initiate (XI)",               minNet: 0          },
  { title: "Xen Core Member (XCM)",           minNet: 50_000     },
  { title: "Xythera Ascendant (XA)",          minNet: 150_000    },
  { title: "Xythera Core Ascendant (XCA)",    minNet: 300_000    },
  { title: "Xythera Prime (XP)",              minNet: 600_000    },
  { title: "Xythera Sovereign (XS)",          minNet: 1_000_000  },
  { title: "Supreme Xytherian (SX)",          minNet: 2_500_000  },
];

function getRank(level) {
  let rank = RANK_LADDER[0];
  for (const r of RANK_LADDER) {
    if (level >= r.minLevel) rank = r;
    else break;
  }
  return rank;
}

function getNextRank(level) {
  for (const r of RANK_LADDER) {
    if (level < r.minLevel) return r;
  }
  return null;
}

function getPrestige(net) {
  let title = PRESTIGE_TITLES[0];
  for (const t of PRESTIGE_TITLES) {
    if (net >= t.minNet) title = t;
    else break;
  }
  return title;
}

function xpNeeded(level) {
  return level * 1000;
}

function buildProgressBar(xp, target, bars = 20) {
  const pct = Math.min(xp / (target || 1), 1);
  const filled = Math.round(bars * pct);
  const empty  = bars - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${Math.round(pct * 100)}%`;
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildProfileBlock(user, rank, cardCount, pokeCount) {
  const level     = user.level  || 1;
  const xp        = user.xp    || 0;
  const money     = user.money  || 0;
  const bank      = user.bank   || 0;
  const orbs      = user.orbs   || 0;
  const vault     = user.vault  || 0;
  const net       = money + bank;
  const bio       = user.bio    || "No bio set.";
  const guild     = user.guildName || "None";
  const streak    = user.streak    || 0;
  const name      = (user.name || "Player").toUpperCase();
  const joined    = formatDate(user.registeredAt);
  const xpTarget  = xpNeeded(level);
  const totalXp   = ((level - 1) * level / 2) * 1000 + xp;  // cumulative approx

  const currentRank = getRank(level);
  const nextRank    = getNextRank(level);
  const prestige    = getPrestige(net);

  const rankStr     = `${currentRank.emoji} ${currentRank.name}`;
  const nextStr     = nextRank
    ? `🔜 Next: ${nextRank.emoji} ${nextRank.name} (Lv.${nextRank.minLevel})`
    : `🔜 Next: 👑 Maxed out`;

  return (
`┌─〔 👤 PLAYER PROFILE 〕
├◆ 🪪 ${name} (#${rank})
│
├◆ ${rankStr}
├◆ ${nextStr}
├◆ 📝 Bio: ${bio}
├◆ 🏰 Guild: ${guild}
├◆ 🏷️ Status: ${prestige.title}
│
├─〔 📊 PROGRESS 〕
│
├◆ 🔰 Level: ${level}
├◆ ${buildProgressBar(xp, xpTarget)}
├◆ ⭐ XP: ${xp.toLocaleString()} / ${xpTarget.toLocaleString()}
├◆ 📈 Total XP: ${totalXp.toLocaleString()}
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
  description: "View the top players with full profile stats",
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

    // Sort by net worth
    const sorted = users
      .map(u => ({ ...u, net: (u.money || 0) + (u.bank || 0) }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 5);

    // ── Bulk-fetch cards & pokémon counts in one round-trip each ─────────────
    const db = await getDb();

    // Cards: mn_users collection stores cards array per userId
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

    // Pokémon: count documents in pokemon_owned per ownerJid
    const ownerJids = sorted.map(u => u._id).filter(Boolean);
    const pokeCounts = await db.collection("pokemon_owned").aggregate([
      { $match: { ownerJid: { $in: ownerJids } } },
      { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
    ]).toArray();
    const pokeMap = {};
    for (const doc of pokeCounts) {
      pokeMap[doc._id] = doc.total;
    }

    // ── Build message ─────────────────────────────────────────────────────────
    const blocks = [];
    for (let i = 0; i < sorted.length; i++) {
      const u      = sorted[i];
      const userId = (u._id || "").split("@")[0].split(":")[0];
      const cards  = cardMap[userId]  || 0;
      const poke   = pokeMap[u._id]   || 0;
      blocks.push(buildProfileBlock(u, i + 1, cards, poke));
    }

    const header = `🏆 *KELIN MD — TOP LEADERBOARD*\n${"━".repeat(30)}\n\n`;
    const text   = header + blocks.join("\n\n");

    await sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
