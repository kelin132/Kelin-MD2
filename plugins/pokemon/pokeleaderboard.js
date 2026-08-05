// plugins/pokemon/pokeleaderboard.js — anime aesthetic theme

import { getDb } from "../../lib/mongo.mjs";

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

      let text = animeHeader("𝗣𝗢𝗞𝗘́𝗠𝗢𝗡  𝗖𝗔𝗧𝗖𝗛  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦", "Top Collectors");

      results.forEach((r, i) => {
        const badge = RANK_BADGES[i] || `『${i + 1}』`;
        const name  = nameMap[r._id] || "Trainer";
        text += `${badge} *${name}*\n`;
        text += `  ┗ 🎮 *${r.total}* Pokémon caught\n`;
        if (i < results.length - 1) text += `  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });

      text += animeFooter();
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

      let text = animeHeader("𝗟𝗘𝗩𝗘𝗟  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦", "Strongest Pokémon");

      results.forEach((p, i) => {
        const badge     = RANK_BADGES[i] || `『${i + 1}』`;
        const typeEmoji = TYPE_EMOJIS[p.primaryType] || "⭐";
        const shiny     = p.shiny ? " ✨" : "";
        const owner     = nameMap[p.ownerJid] || "Trainer";
        text += `${badge} ${typeEmoji} *${p.displayName || p.name}${shiny}*\n`;
        text += `  ┗ 🏅 Lv.*${p.level}*  〔 👤 *${owner}* 〕\n`;
        if (i < results.length - 1) text += `  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });

      text += animeFooter();
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

      let text = animeHeader("𝗕𝗔𝗧𝗧𝗟𝗘  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦", "Elite Trainers");

      results.forEach((t, i) => {
        const badge  = RANK_BADGES[i] || `『${i + 1}』`;
        const losses = t.losses || 0;
        const ratio  = losses > 0 ? (t.wins / (t.wins + losses) * 100).toFixed(0) : "100";
        text += `${badge} *${t.username || "Trainer"}*\n`;
        text += `  ┗ ⚔️ *${t.wins}W* / ${losses}L  〔 📊 *${ratio}%* win rate 〕\n`;
        if (i < results.length - 1) text += `  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });

      text += animeFooter();
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: `❌ Unknown category *"${sub}"*\n\nAvailable: *count*, *level*, *battles*\nType *.pokeleaderboard* to see all options.`,
    }, { quoted: msg });
  },
};
