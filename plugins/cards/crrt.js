import { Col } from "./db.js";

const TIER_POWER = {
  Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5, Mythic: 6,
};

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡", Mythic: "🔴",
};

export default {
  name: "crarity",
  aliases: ["raritycheck", "crrt"],
  category: "cards",
  description: "Check the rarity/power of a card by name or ID",
  usage: ".crarity <card name or ID>",

  async run({ sock, msg, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const query = args.join(" ").trim();
      if (!query) return reply("❌ Usage: .crarity <card name or ID>");

      let card = await Col.cards().findOne({ cardId: query.toUpperCase() });
      if (!card) {
        card = await Col.cards().findOne({ name: { $regex: new RegExp(query, "i") } });
      }

      if (!card) return reply("❌ Card not found.");

      const tier    = card.tier || "Common";
      const power   = TIER_POWER[tier] || 0;
      const emoji   = TIER_EMOJI[tier] || "⚪";
      const bar     = "█".repeat(power) + "░".repeat(6 - power);

      const text =
`🃏 *RARITY CHECK*

${emoji} *${card.name}*
🆔 ID: ${card.cardId}

⭐ Tier: *${tier}*
💥 Power: *${power}/6*
📊 [${bar}]

> ${tier === "Mythic" ? "Extremely rare! 🔥" :
    tier === "Legendary" ? "Very hard to find! ✨" :
    tier === "Epic" ? "A strong card! 💪" :
    tier === "Rare" ? "Not bad at all!" :
    tier === "Uncommon" ? "Decent pick." :
    "Common — still worth collecting."}`;

      return reply(text);

    } catch (err) {
      console.error("CRRT ERROR:", err);
      return reply("❌ Rarity check failed.");
    }
  },
};
