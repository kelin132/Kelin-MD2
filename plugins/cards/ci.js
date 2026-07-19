import { Col } from "./db.js";

const TIER_INPUT = {
  "1": "Common", "2": "Uncommon", "3": "Rare",
  "4": "Epic",   "5": "Legendary", "S": "Mythic", "s": "Mythic",
};

export default {
  name: "ci",
  aliases: ["cardinfo"],
  category: "cards",
  description: "View detailed info about a card by ID or name+tier",
  usage: ".ci <card_id>  or  .ci <name> <tier 1-5,S>",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      if (!args.length) return reply("❌ Usage:\n.ci <card_id>\n.ci <name> <tier 1,2,3,4,5,S>");

      const input = args.join(" ").trim();
      let card = null;

      // 1. Try exact ID match
      const isLikelyId = args.length === 1 && (input.length <= 8 || input.includes("-"));
      if (isLikelyId) {
        card = await Col.cards().findOne({ cardId: input.toUpperCase() });
      }

      // 2. Name + Tier search
      if (!card && args.length >= 2) {
        const lastArg = args[args.length - 1].toUpperCase();
        const mappedTier = TIER_INPUT[lastArg];
        if (mappedTier) {
          const nameQuery = args.slice(0, -1).join(" ").trim();
          card = await Col.cards().findOne({
            name: new RegExp(`^${nameQuery}$`, "i"),
            tier: mappedTier,
          });
        }
      }

      // 3. If the name exists but no tier given
      if (!card && !isLikelyId) {
        const nameExists = await Col.cards().findOne({ name: new RegExp(`^${input}$`, "i") });
        if (nameExists) return reply("❌ What tier is it? I'm not Google, specify the tier too!");
      }

      // 4. Suggestions
      if (!card) {
        const similar = await Col.cards().find({ name: new RegExp(input, "i") }).limit(5).toArray();
        if (similar.length) {
          let suggest = "❌ Card not found. Did you mean:\n\n";
          similar.forEach((c, i) => {
            suggest += `${i + 1}. ${c.name} (${c.cardId}) [${c.tier}]\n`;
          });
          return reply(suggest);
        }
        return reply("❌ Card not found.");
      }

      // Find owners
      const ownerDocs = await Col.users().find({ "cards.cardId": card.cardId }).limit(10).toArray();
      const owners = ownerDocs.map(u => u.username || u.userId || "Unknown");
      const ownerText = owners.length
        ? owners.map((n, i) => `${i + 1}. ${n}`).join("\n")
        : "No owners yet";

      const text =
`∘₊✧──────✧₊∘
🎴 *CARD INFO*
∘₊✧──────✧₊∘

*Name:* ${card.name}
*Tier:* ${card.tier}
*ID:* ${card.cardId}
*Value:* $${(card.price || 0).toLocaleString()}
*Series:* ${card.series || "Unknown"}

*Owners:*
${ownerText}

*Description:*
${card.description || "No description available."}
∘₊✧──────✧₊∘`;

      if (card.media) {
        try {
          const mediaConfig = card.mediaType === "video"
            ? { video: { url: card.media }, gifPlayback: true }
            : { image: { url: card.media } };
          return await sock.sendMessage(jid, { ...mediaConfig, caption: text }, { quoted: msg });
        } catch { /* fall through */ }
      }

      return reply(text);

    } catch (err) {
      console.error("CI ERROR:", err);
      return reply("❌ Command failed.");
    }
  },
};
