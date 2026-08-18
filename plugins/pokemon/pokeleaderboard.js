// plugins/pokemon/pokeleaderboard.js — anime aesthetic theme

import { getDb } from "../../lib/mongo.mjs";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

const TYPE_EMOJIS = {
  fire:"🔥", water:"💧", grass:"🍃", electric:"⚡", psychic:"🔮",
  normal:"⭐", flying:"🌤️", bug:"🐛", poison:"☠️", rock:"🪨",
  ground:"🌍", ice:"❄️", fighting:"🥊", ghost:"👻",
  dragon:"🐉", dark:"🌑", steel:"⚙️", fairy:"🌸",
};

const RANK_BADGES = [
  "『 𝟏 』","『 𝟐 』","『 𝟑 』","『 𝟒 』","『 𝟓 』",
  "『 𝟔 』","『 𝟕 』","『 𝟖 』","『 𝟗 』","『 𝟏𝟎 』",
];

// ── Anime-style header builder ────────────────────────────────────────────────
function animeHeader(title, subtitle) {
  return (
    `⚡ *${title}* ⚡\n` +
    `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
    `  🌸 *${subtitle}*\n` +
    `  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n\n`
  );
}

function animeFooter() {
  return `\n✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n🌺 _Use *.pokeleaderboard* to see all categories_`;
}

export default {
  name: "pokeleaderboard",
  aliases: ["pokelb", "pokenrank", "poketop"],
  description: "Pokémon trainer leaderboards — count, level, battles",
  category: "pokemon",
  usage: ".pokeleaderboard  |  .pokeleaderboard count  |  .pokeleaderboard level  |  .pokeleaderboard battles",

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] || "").toLowerCase();
    const db  = await getDb();

    // ── Category menu ─────────────────────────────────────────────────────────
    if (!sub) {
      return sock.sendMessage(jid, {
        text:
`⛩️  *𝗣𝗢𝗞𝗘́𝗠𝗢𝗡  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦* ⛩️
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
  🌸 *Choose your battlefield:*
  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦

  🎯 *.pokeleaderboard count* — Most Pokémon caught
  ⭐ *.pokeleaderboard level* — Highest-level Pokémon
  ⚔️  *.pokeleaderboard battles* — Most battles won

✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦
🌺 _The path of a true trainer awaits_`,
      }, { quoted: msg });
    }

    // ── Most Pokémon caught ───────────────────────────────────────────────────
    if (sub === "count" || sub === "caught") {
      const results = await db.collection("pokemon_owned").aggregate([
        { $group: { _id: "$ownerJid", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, { text: "📭 No Pokémon caught yet!" }, { quoted: msg });
      }

      const trainers = await db.collection("pokemon_trainers").find({
        jid: { $in: results.map(r => r._id) },
      }).toArray();
      const nameMap = {};
      for (const t of trainers) nameMap[t.jid] = t.username || "Trainer";

      const text = formatAnimeLeaderboard({
        subtitle: "POKÉMON CATCH LEADERBOARD",
        rows: results.map((r) => ({ name: nameMap[r._id] || "Trainer", value: r.total })),
        valueIcon: "🎮",
        valueLabel: "𝐏𝐎𝐊𝐄́𝐌𝐎𝐍",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── Highest-level Pokémon ─────────────────────────────────────────────────
    if (sub === "level" || sub === "levels") {
      const results = await db.collection("pokemon_owned").find({})
        .sort({ level: -1 }).limit(10).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, { text: "📭 No Pokémon registered yet!" }, { quoted: msg });
      }

      const ownerJids = [...new Set(results.map(r => r.ownerJid))];
      const trainers  = await db.collection("pokemon_trainers").find({ jid: { $in: ownerJids } }).toArray();
      const nameMap   = {};
      for (const t of trainers) nameMap[t.jid] = t.username || "Trainer";

      const text = formatAnimeLeaderboard({
        subtitle: "POKÉMON LEVEL LEADERBOARD",
        rows: results.map((p) => ({ name: `${TYPE_EMOJIS[p.primaryType] || "⭐"} ${p.displayName || p.name}${p.shiny ? " ✨" : ""}`, value: p.level })),
        valueIcon: "🏅",
        valueLabel: "𝐋𝐄𝐕𝐄𝐋",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    // ── Most battles won ──────────────────────────────────────────────────────
    if (sub === "battles" || sub === "wins") {
      const results = await db.collection("pokemon_trainers")
        .find({ wins: { $exists: true, $gt: 0 } })
        .sort({ wins: -1 }).limit(10).toArray();

      if (!results.length) {
        return sock.sendMessage(jid, {
          text: "⚔️ No battle wins recorded yet!\nStart battles with *.catch* or *.challenge*.",
        }, { quoted: msg });
      }

      const text = formatAnimeLeaderboard({
        subtitle: "POKÉMON BATTLE LEADERBOARD",
        rows: results.map((t) => ({ name: t.username || "Trainer", value: t.wins })),
        valueIcon: "⚔️",
        valueLabel: "𝐖𝐈𝐍𝐒",
        footer: "🌸 𝐀𝐍𝐈𝐌𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: `❌ Unknown category *"${sub}"*\n\nAvailable: *count*, *level*, *battles*\nType *.pokeleaderboard* to see all options.`,
    }, { quoted: msg });
  },
};
