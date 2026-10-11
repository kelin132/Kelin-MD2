import { findOrCreateUser } from "./db.js";
import { TIER_NAME, TIER_NUM } from "../../lib/cardApi.mjs";

const TIER_ORDER = Object.keys(TIER_NAME);

function cardTier(card) {
  const value = String(card.tierNum || card.tier || "").trim();
  return TIER_NUM[value.toLowerCase()] || TIER_NUM[value.toUpperCase()] || value.toUpperCase();
}

export default {
  name: "tier",
  aliases: ["mytiers"],
  category: "cards",
  description: "View your cards grouped by tier",
   usage: ".tier [1-6, S, C, R, SR, SSR, UR, or X]",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!Array.isArray(user.cards) || user.cards.length === 0) {
        return reply("❌ You don't have any cards.");
      }

      const validTiers  = TIER_ORDER;
      const filterInput = args[0];
      const filterTier  = filterInput
        ? TIER_NUM[String(filterInput).toLowerCase()] || TIER_NUM[String(filterInput).toUpperCase()]
        : null;

      if (filterInput && (!filterTier || !validTiers.includes(filterTier))) {
        return reply("❌ Invalid tier. Use 1–6, S, C, R, SR, SSR, UR, or X.");
      }

      const ReadMore = "\u200e".repeat(4000);

      let text =
`🃏 *Tier Filtered Collection*

${ReadMore}
📦 Total Cards: ${user.cards.length}
`;

      const filtered = filterTier
        ? user.cards.filter(c => cardTier(c) === filterTier)
        : user.cards;

      if (filterTier && filtered.length === 0) {
        return reply(`❌ No cards found in tier ${filterTier}`);
      }

      if (filterTier) {
        text += `\n🎯 *Tier ${filterTier} Cards:*\n\n`;
        filtered.forEach((card, i) => { text += `${i + 1}. 🃏 ${card.name}\n`; });
      } else {
        const grouped = Object.fromEntries(validTiers.map((tier) => [tier, []]));
        for (const card of filtered) {
          const t = cardTier(card);
          if (grouped[t]) grouped[t].push(card.name);
        }

        text += "\n📊 *Grouped by Tier*\n";
        for (const tier of validTiers) {
          const list = grouped[tier];
          text += `\n🏷️ *Tier ${tier}*\n`;
          if (list.length === 0) {
            text += "- None\n";
          } else {
            list.forEach((name, i) => { text += `*${i + 1}. ${name}*\n`; });
          }
        }
      }

      return await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });

    } catch (err) {
      console.error("TIER ERROR:", err);
      return reply("❌ Failed to load tier list.");
    }
  },
};
