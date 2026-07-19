import { getCard, TIER_EMOJI } from "../../lib/cardApi.mjs";

const TIER_POWER = {
  Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5,
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

      const card = await getCard(query);
      if (!card) return reply(`❌ Card not found for "${query}".`);

      const power = TIER_POWER[card.tier] || 1;
      const emoji = TIER_EMOJI[card.tier]  || "⭐";
      const bar   = "█".repeat(power) + "░".repeat(5 - power);

      const text =
`🃏 *RARITY CHECK*

${emoji} *${card.name}*
🆔 ID: ${card.cardId}
📺 Series: ${card.series}

⭐ Tier: *${card.tier}*
💥 Power: *${power}/5*
📊 [${bar}]

> ${card.tier === "Legendary" ? "Extremely rare! 🔥" :
    card.tier === "Epic"      ? "Very hard to find! ✨" :
    card.tier === "Rare"      ? "A solid card! 💪" :
    card.tier === "Uncommon"  ? "Decent pick." :
    "Common — still worth collecting."}`;

      return reply(text);

    } catch (err) {
      console.error("CRRT ERROR:", err);
      return reply("❌ Rarity check failed.");
    }
  },
};
