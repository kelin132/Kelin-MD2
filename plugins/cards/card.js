import { findOrCreateUser } from "./db.js";
import { sendCardMedia, TIER_EMOJI } from "../../lib/cardApi.mjs";

export default {
  name: "card",
  aliases: ["viewcard"],
  category: "cards",
  description: "View a card from your collection by index",
  usage: ".card <index>",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!Array.isArray(user.cards) || user.cards.length === 0) {
        return reply(
`╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐕𝐈𝐄𝐖* 」❀─╮
│ ❌ You have no cards yet!
│
│ 💡 Wait for a spawn and type
│    *.claim <ID>* to grab one.
╰───────────────❀`
        );
      }

      if (!args[0]) {
        return reply(
`╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐕𝐈𝐄𝐖* 」❀─╮
│ 💡 *Usage* :: *.card <index>*
│
│ 🃏 You own *${user.cards.length}* card(s).
│    Use *.col* to browse them.
╰───────────────❀`
        );
      }

      const index = parseInt(args[0]);
      if (isNaN(index) || index < 1 || index > user.cards.length) {
        return reply(
`╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐕𝐈𝐄𝐖* 」❀─╮
│ ❌ Invalid card number!
│
│ 🃏 You have *${user.cards.length}* card(s).
│    Use *.col* to see the list.
╰───────────────❀`
        );
      }

      const card  = user.cards[index - 1];
      const emoji = TIER_EMOJI[card.tier] || "⭐";

      const caption =
`╭─❀「 🎴 *𝐂𝐀𝐑𝐃 𝐕𝐈𝐄𝐖* 」❀─╮
│ ${emoji} *${card.name || "Unknown"}*
│
│ 🏷️  *Tier*   :: *${card.tier || "Unknown"}*
│ 📺 *Series* :: *${card.series || "Unknown"}*
│ 🆔 *ID*     :: \`${card.cardId || "Unknown"}\`
│ 💎 *Value*  :: *$${(card.price || 0).toLocaleString()}*
│
│ 🃏 Card *#${index}* of *${user.cards.length}*
╰───────────────❀`;

      if (card.media) {
        try {
          return await sendCardMedia(sock, jid, card, caption, { quoted: msg });
        } catch { /* fall through to text */ }
      }

      return reply(caption);

    } catch (err) {
      console.error("CARD ERROR:", err);
      return reply("❌ Failed to show card.");
    }
  },
};
