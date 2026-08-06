/**
 * .cardlb — Top 10 card collectors — anime aesthetic theme
 */
import { Col } from "./db.js";
import { getUser as getEconomyUser } from "../economy/database.js";

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
};

const TIER_SCORE = { Common: 1, Uncommon: 3, Rare: 10, Epic: 30, Legendary: 100 };

const RANK_BADGES = [
  "『 𝟏 』","『 𝟐 』","『 𝟑 』","『 𝟒 』","『 𝟓 』",
  "『 𝟔 』","『 𝟕 』","『 𝟖 』","『 𝟗 』","『 𝟏𝟎 』",
];

const COLLECTOR_TITLES = [
  "🟡 Legendary Collector", "🟣 Epic Archivist",    "🔵 Rare Scholar",
  "✨ Card Sovereign",       "🌸 Sakura Keeper",     "🗡️ Blade Collector",
  "🌙 Night Curator",        "🔥 Flame Collector",   "💧 Tide Archivist",
  "⭐ Rising Collector",
];

export default {
  name:     "cardlb",
  aliases:  ["clb", "card-leaderboard", "cardtop"],
  category: "cards",
  description: "Top 10 card collectors",
  usage:    ".cardlb",
  cooldown: 15,

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });

    try {
      const col   = await Col.users();
      const users = await col.find({}).toArray();

      if (!users || users.length === 0) return reply("❌ No card collectors found yet.");

      const scored = users
        .filter((u) => Array.isArray(u.cards) && u.cards.length > 0)
        .map((u) => {
          const tierCounts = {};
          let rarityScore  = 0;
          for (const card of u.cards) {
            const t = card.tier || "Common";
            tierCounts[t]  = (tierCounts[t] || 0) + 1;
            rarityScore   += TIER_SCORE[t] || 1;
          }
          return {
            userId:      u.userId || "?",
            whatsappJid: u.whatsappNumber || `${u.userId}@s.whatsapp.net`,
            total:       u.cards.length,
            rarityScore,
            tierCounts,
          };
        })
        .sort((a, b) => b.rarityScore - a.rarityScore || b.total - a.total)
        .slice(0, 10);

      if (scored.length === 0) return reply("❌ No one has collected any cards yet!");

      const names = await Promise.all(
        scored.map(async (u) => {
          try {
            const eu = await getEconomyUser(u.whatsappJid);
            if (eu?.registered && eu?.name) return eu.name;
          } catch { /* fall through */ }
          return u.userId;
        })
      );

      // ── Build message ──────────────────────────────────────────────────────
      let text = `🃏 *𝗖𝗔𝗥𝗗  𝗖𝗢𝗟𝗟𝗘𝗖𝗧𝗢𝗥  𝗥𝗔𝗡𝗞𝗜𝗡𝗚𝗦* 🃏\n`;
      text    += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
      text    += `  🌸 *Top 10 by Rarity Score*\n`;
      text    += `  ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n\n`;

      scored.forEach((u, i) => {
        const badge  = RANK_BADGES[i]      || `『${i + 1}』`;
        const title  = COLLECTOR_TITLES[i] || "⭐ Collector";
        const tiers  = ["Legendary","Epic","Rare","Uncommon","Common"]
          .filter((t) => u.tierCounts[t])
          .map((t)  => `${TIER_EMOJI[t]}×*${u.tierCounts[t]}*`)
          .join(" ");

        text += `${badge} *${names[i]}*\n`;
        text += `  ┗ ${title}\n`;
        text += `  📦 *${u.total}* cards  〔 ⭐ *${u.rarityScore.toLocaleString()} pts* 〕\n`;
        text += `  ${tiers}\n`;
        if (i < scored.length - 1) text += `  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
      });

      text += `\n✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦\n`;
      text += `  🌺 *Legend* ×100  •  *Epic* ×30  •  *Rare* ×10\n`;
      text += `🌸 _May your collection grow beyond legend_`;

      return reply(text);

    } catch (err) {
      console.error("CARDLB ERROR:", err);
      return reply("❌ Failed to load leaderboard.");
    }
  },
};
