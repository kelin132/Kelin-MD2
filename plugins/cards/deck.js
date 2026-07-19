import { findOrCreateUser } from "./db.js";

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
};
const STARS = { Common: 1, Uncommon: 2, Rare: 3, Epic: 4, Legendary: 5 };

export default {
  name: "deck",
  aliases: ["dk"],
  category: "cards",
  description: "View your card deck with details",
  usage: ".deck [page]",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!user?.cards?.length) {
        return reply("❌ You don't have any cards in your deck yet.");
      }

      const limit      = 12;
      let   page       = parseInt(args[0]) || 1;
      const totalCards = user.cards.length;
      const totalPages = Math.ceil(totalCards / limit);
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const start     = (page - 1) * limit;
      const deckSlice = user.cards.slice(start, start + limit);
      const ReadMore  = "\u200e".repeat(4001);

      let text = `🎴 *YOUR DECK*\n`;
      text += `> Page ${page}/${totalPages} | Total: ${totalCards}\n`;
      text += ReadMore + "\n\n";

      for (let i = 0; i < deckSlice.length; i++) {
        const card      = deckSlice[i];
        const emoji     = TIER_EMOJI[card.tier] || "⭐";
        const starCount = STARS[card.tier] || 1;
        const stars     = "⭐".repeat(starCount);

        text += `${start + i + 1}. *${card.name}*\n`;
        text += `${emoji} *${card.tier || "Common"}* ${stars}\n`;
        text += `📺 ${card.series || "Unknown"}\n\n`;
      }

      if (totalPages > 1) text += `_Use .deck <page> to see more_`;

      return reply(text);

    } catch (err) {
      console.error("DECK ERROR:", err);
      return reply("❌ Failed to load your deck.");
    }
  },
};
