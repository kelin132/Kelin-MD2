import { findOrCreateUser } from "./db.js";

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
};

export default {
  name: "col",
  aliases: ["mycol", "mycards"],
  category: "cards",
  description: "View your card collection",
  usage: ".col [page]",

  async run({ sock, msg, sender, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const user = await findOrCreateUser(sender);

      if (!Array.isArray(user.cards) || user.cards.length === 0) {
        return reply("❌ You don't have any cards yet.\n\nWait for a spawn and type *.claim <ID>* to grab one!");
      }

      const limit      = 20;
      let   page       = parseInt(args[0]) || 1;
      const total      = user.cards.length;
      const totalPages = Math.ceil(total / limit);
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const start = (page - 1) * limit;
      const slice = user.cards.slice(start, start + limit);

      const ReadMore = "\u200e".repeat(4000);
      let text =
`🃏 *Card Collection*
${ReadMore}
👤 @${sender.split("@")[0]}
📦 ${total} card${total !== 1 ? "s" : ""} | Page ${page}/${totalPages}

`;

      slice.forEach((card, i) => {
        const emoji = TIER_EMOJI[card.tier] || "⭐";
        text += `${start + i + 1}. ${emoji} *${card.name}*\n`;
      });

      if (totalPages > 1) {
        text += `\n_Use .col <page> to see more_`;
      }

      return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });

    } catch (err) {
      console.error("COL ERROR:", err);
      return reply("❌ Failed to load your collection.");
    }
  },
};
