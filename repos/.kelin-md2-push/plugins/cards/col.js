import { findOrCreateUser } from "./db.js";

const TIER_EMOJI = {
  Common: "⚪", Uncommon: "🟢", Rare: "🔵", Epic: "🟣", Legendary: "🟡",
  Mythical: "🔴", Secret: "🌟",
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
        return reply(
`╭─❀「 🃏 *𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐈𝐎𝐍* 」❀─╮
│ 🌙 *Result*  :: *EMPTY 🔴*
│ 🍃 *Flavour* :: _カードがまだない！_
│
│ ⚠️ You don't have any cards yet.
│ 💡 Wait for a spawn and \`.claim <ID>\`
╰───────────────❀`
        );
      }

      const limit      = 20;
      let   page       = parseInt(args[0]) || 1;
      const total      = user.cards.length;
      const totalPages = Math.ceil(total / limit);
      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      const start = (page - 1) * limit;
      const slice = user.cards.slice(start, start + limit);

      let cardLines = slice.map((card, i) => {
        const emoji = TIER_EMOJI[card.tier] || "⭐";
        return `│  \`${start + i + 1}.\` ${emoji} \`${card.name}\``;
      }).join("\n");

      let text =
`╭─❀「 🃏 *𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐈𝐎𝐍* 」❀─╮
│ 👤 *User*    :: \`@${sender.split("@")[0]}\`
│ 📦 *Cards*   :: \`${total} card${total !== 1 ? "s" : ""}\`
│ 📄 *Page*    :: \`${page} / ${totalPages}\`
│
${cardLines}`;

      if (totalPages > 1) {
        text += `\n│\n│ 💡 \`.col <page>\` to see more`;
      }

      text += `\n╰───────────────❀`;

      return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });

    } catch (err) {
      return reply(
`╭─❀「 🃏 *𝐂𝐎𝐋𝐋𝐄𝐂𝐓𝐈𝐎𝐍* 」❀─╮
│ ❌ *Result*  :: *ERROR 🔴*
│
│ ⚠️ Failed to load your collection.
╰───────────────❀`
      );
    }
  },
};
