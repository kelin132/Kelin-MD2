/**
 * .cardlb   — Top 10 card collectors by total cards & rarity score
 */
import { Col } from "./db.js";

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
};

// Rarity score weights — used to break ties
const TIER_SCORE = { Common: 1, Uncommon: 3, Rare: 10, Epic: 30, Legendary: 100 };

export default {
  name:     "cardlb",
  aliases:  ["clb", "card-leaderboard", "clb-card-leaderboard", "cardtop"],
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

      // Score each user
      const scored = users
        .filter((u) => Array.isArray(u.cards) && u.cards.length > 0)
        .map((u) => {
          const tierCounts = {};
          let rarityScore  = 0;
          for (const card of u.cards) {
            const t = card.tier || "Common";
            tierCounts[t] = (tierCounts[t] || 0) + 1;
            rarityScore  += TIER_SCORE[t] || 1;
          }
          return {
            userId:     u.userId || "?",
            total:      u.cards.length,
            rarityScore,
            tierCounts,
            // Best card (highest tier)
            bestTier: ["Legendary","Epic","Rare","Uncommon","Common"].find((t) => tierCounts[t]) || "Common",
          };
        })
        .sort((a, b) => b.rarityScore - a.rarityScore || b.total - a.total)
        .slice(0, 10);

      if (scored.length === 0) return reply("❌ No one has collected any cards yet!");

      const medals = ["🥇", "🥈", "🥉"];

      let text = "🃏 *CARD COLLECTOR LEADERBOARD*\n";
      text    += "Top 10 by rarity score\n";
      text    += "─".repeat(30) + "\n\n";

      scored.forEach((u, i) => {
        const rank  = i < 3 ? medals[i] : `${i + 1}.`;
        const tiers = ["Legendary","Epic","Rare","Uncommon","Common"]
          .filter((t) => u.tierCounts[t])
          .map((t) => `${TIER_EMOJI[t]}×${u.tierCounts[t]}`)
          .join(" ");

        text += `${rank} *${u.userId}*\n`;
        text += `   📦 ${u.total} cards  |  ⭐ Score: ${u.rarityScore.toLocaleString()}\n`;
        text += `   ${tiers}\n\n`;
      });

      text += "💡 Score = cards weighted by rarity (Legendary×100, Epic×30, Rare×10...)";

      return reply(text);

    } catch (err) {
      console.error("CARDLB ERROR:", err);
      return reply("❌ Failed to load leaderboard.");
    }
  },
};
