import { findOrCreateUser } from "./database.js";

export default {
  name: "card",
  aliases: ["viewcard"],
  category: "cards",
  description: "View a card from your collection by index",
  usage: ".card <index>",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!Array.isArray(user.cards) || user.cards.length === 0) {
        return reply("❌ You have no cards. Claim one when a card spawns!");
      }

      if (!args[0]) return reply("❌ Usage: .card <index>\nUse .col to see your card indexes.");

      const index = parseInt(args[0]);
      if (isNaN(index) || index < 1 || index > user.cards.length) {
        return reply(`❌ Invalid card number. You have ${user.cards.length} cards.`);
      }

      const card = user.cards[index - 1];

      const caption =
`∘₊✧──────✧₊∘
🎴 *CARD VIEW*
∘₊✧──────✧₊∘

*Name:* ${card.name || "Unknown"}
*ID:* ${card.cardId || "Unknown"}
*Tier:* ${card.tier || "Unranked"}
*Value:* $${(card.price || 0).toLocaleString()}

*Description:*
${card.description || "No description"}

∘₊✧──────✧₊∘`;

      if (card.media) {
        try {
          if (card.mediaType === "video") {
            return await sock.sendMessage(jid, {
              video: { url: card.media },
              gifPlayback: true,
              caption,
            }, { quoted: msg });
          }
          return await sock.sendMessage(jid, {
            image: { url: card.media },
            caption,
          }, { quoted: msg });
        } catch {
          // fall through to text only
        }
      }

      return reply(caption);

    } catch (err) {
      console.error("CARD ERROR:", err);
      return reply("❌ Failed to show card.");
    }
  },
};
