// plugins/pokemon/pokeleaderboard.js
// .pokeleaderboard — Pokémon trainer rankings
// Subcommands: .pokeleaderboard (overview) | .pokeleaderboard count | .pokeleaderboard level | .pokeleaderboard battles

import { getDb } from "../../lib/mongo.mjs";

const TYPE_EMOJIS = {
  fire:"🔥",water:"💧",grass:"🍃",electric:"⚡",psychic:"🔮",normal:"⭐",
  flying:"🌤️",bug:"🐛",poison:"☠️",rock:"🪨",ground:"🌍",ice:"❄️",
  fighting:"🥊",ghost:"👻",dragon:"🐉",dark:"🌑",steel:"⚙️",fairy:"🌸",
};

const MEDALS = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

export default {
  name: "pokeleaderboard",
  aliases: ["pokelb", "pokenrank", "poketop"],
  description: "Pokémon trainer leaderboards — count, level, battles",
  category: "pokemon",
  usage: ".pokeleaderboard  |  .pokeleaderboard count  |  .pokeleaderboard level  |  .pokeleaderboard battles",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();

    const db = await getDb();

    // ── Category menu (no args) ────────────────────────────────────────────
    if (!sub) {
      return sock.sendMessage(jid, {
        text:
`🏆 *POKÉMON LEADERBOARDS*

Choose a category:

🎯 *.pokeleaderboard count* — Most Pokémon caught
⭐ *.pokeleaderboard level* — Highest-level Pokémon
⚔️ *.pokeleaderboard battles* — Most battles won

━━━━━━━━━━━━━━━━━━━━
💡 *Other commands:*
• *.leaderboard* — Economy rich list
• *.party* — View your party
• *.pc* — View your PC storage`,
      }, { quoted: msg });
    }

    // ── Most Pokémon caught ───────────────────────────────────────────────
    if (sub === "count" || sub === "caught") {
      const results = await db.collection("pokemon_owned").aggregate([
        { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, { text: "📭 No Pokémon caught yet!" }, { quoted: msg });
      }

      // Resolve trainer usernames
      const trainers = await db.collection("pokemon_trainers").find({
        jid: { $in: results.map(r => r._id) },
      }).toArray();
      const nameMap = {};
      for (const t of trainers) nameMap[t.jid] = t.username || "Trainer";

      const rows = results.map((r, i) =>
        `${MEDALS[i] || `${i+1}.`} *${nameMap[r._id] || "Trainer"}* — ${r.total} Pokémon`
      ).join("\n");

      return sock.sendMessage(jid, {
        text: `🎯 *MOST POKÉMON CAUGHT*\n\n${rows}\n\n━━━━━━━━━━━━━━━━━━━━\nUse *.pokeleaderboard* to see all categories.`,
      }, { quoted: msg });
    }

    // ── Highest-level Pokémon ─────────────────────────────────────────────
    if (sub === "level" || sub === "levels") {
      const results = await db.collection("pokemon_owned").find({})
        .sort({ level: -1 })
        .limit(10)
        .toArray();

      if (!results.length) {
        return sock.sendMessage(jid, { text: "📭 No Pokémon registered yet!" }, { quoted: msg });
      }

      const ownerJids = [...new Set(results.map(r => r.ownerJid))];
      const trainers = await db.collection("pokemon_trainers").find({
        jid: { $in: ownerJids },
      }).toArray();
      const nameMap = {};
      for (const t of trainers) nameMap[t.jid] = t.username || "Trainer";

      const rows = results.map((p, i) => {
        const typeEmoji = TYPE_EMOJIS[p.primaryType] || "⭐";
        const shiny = p.shiny ? " ✨" : "";
        const owner = nameMap[p.ownerJid] || "Trainer";
        return `${MEDALS[i] || `${i+1}.`} ${typeEmoji} *${p.displayName || p.name}${shiny}* Lv.${p.level}\n   👤 ${owner}`;
      }).join("\n");

      return sock.sendMessage(jid, {
        text: `⭐ *HIGHEST-LEVEL POKÉMON*\n\n${rows}\n\n━━━━━━━━━━━━━━━━━━━━\nUse *.pokeleaderboard* to see all categories.`,
      }, { quoted: msg });
    }

    // ── Most battles won ──────────────────────────────────────────────────
    if (sub === "battles" || sub === "wins") {
      const results = await db.collection("pokemon_trainers").find({ wins: { $exists: true, $gt: 0 } })
        .sort({ wins: -1 })
        .limit(10)
        .toArray();

      if (!results.length) {
        return sock.sendMessage(jid, {
          text: "⚔️ No battle wins recorded yet!\nStart battles with *.catch* or *.challenge*.",
        }, { quoted: msg });
      }

      const rows = results.map((t, i) => {
        const losses = t.losses || 0;
        const ratio = losses > 0 ? (t.wins / (t.wins + losses) * 100).toFixed(0) : "100";
        return `${MEDALS[i] || `${i+1}.`} *${t.username || "Trainer"}* — ${t.wins}W / ${losses}L (${ratio}%)`;
      }).join("\n");

      return sock.sendMessage(jid, {
        text: `⚔️ *BATTLE WIN LEADERS*\n\n${rows}\n\n━━━━━━━━━━━━━━━━━━━━\nUse *.pokeleaderboard* to see all categories.`,
      }, { quoted: msg });
    }

    // Unknown subcommand
    return sock.sendMessage(jid, {
      text: `❌ Unknown category *"${sub}"*\n\nAvailable: *count*, *level*, *battles*\nType *.pokeleaderboard* to see all options.`,
    }, { quoted: msg });
  },
};
