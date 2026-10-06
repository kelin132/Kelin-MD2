/**
 * KELIN MD — .lb
 * Wealth Leaderboard Command
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

  const rows = users.map((user, index) => {
    const userJid = String(user._id || user.jid || user.whatsappNumber || "");
    const cleanId = userJid.split("@")[0].split(":")[0];
    const name = user.name || user.username || `User_${cleanId.slice(-4)}`;
    const medal = getMedal(index);

    return [
      `${medal} *${name}*`,
      `💰 Wealth: ${formatMoney(user.totalWealth)}`,
    ].join("\n");
  });

  return [
    "ㅤㅤ∘]───❀───[∘",
    "*∘₊✧ WEALTH RANKINGS* ❀",
    "      ∘]───❀───[∘",
    "",
    "━━━━━━━━━━━━━━━",
    rows.join("\n\n"),
    "━━━━━━━━━━━━━━━",
    "_May your wealth grow like the sakura_",
  ].join("\n");
}

export default {
  name: "lb",
  description: "View top richest players",
  category: "economy",
  usage: ".lb",
  aliases: ["kb", "leaderboard", "wealthlb"],
  cooldown: 8,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    const db = await getDb();

    await ensureTotalWealthMigration(db);
    const text = await getCachedLeaderboard(
      "economy:wealth:v2",
      () => loadWealthText(db),
      { ttlMs: 0, staleWhileRevalidate: false }
    );

    return sock.sendMessage(jid, { text }, { quoted: msg });
  },
};
