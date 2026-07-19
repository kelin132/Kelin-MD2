import { Col } from "./db.js";

const RARITY_MAP = {
  "1": "Common", "2": "Uncommon", "3": "Rare",
  "4": "Epic",   "5": "Legendary", "6": "Mythic", "s": "Mythic",
  "common": "Common", "uncommon": "Uncommon", "rare": "Rare",
  "epic": "Epic", "legendary": "Legendary", "mythic": "Mythic",
};

export default {
  name: "clist",
  aliases: ["cardslist", "cl"],
  category: "cards",
  description: "List all cards by tier",
  usage: ".clist <tier> [page]",

  async run({ sock, msg, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      if (!args[0]) {
        return reply(
`❌ Usage: .clist <tier> [page]

1 = Common
2 = Uncommon
3 = Rare
4 = Epic
5 = Legendary
6 = Mythic

Example: .clist 3  or  .clist mythic 2`
        );
      }

      const input = args[0].toLowerCase();
      const tier  = RARITY_MAP[input];
      if (!tier) return reply("❌ Invalid tier.");

      let page = parseInt(args[1]) || 1;
      if (page < 1) page = 1;

      const limit = 2500;
      const skip  = (page - 1) * limit;
      const total = await Col.cards().countDocuments({ tier });

      if (!total) return reply(`❌ No ${tier} cards found.`);

      const totalPages = Math.ceil(total / limit);
      if (page > totalPages) page = totalPages;

      const cards = await Col.cards().find({ tier }).sort({ name: 1 }).skip(skip).limit(limit).toArray();

      let text =
`*${tier.toUpperCase()} CARDS LIST*

📦 Total Cards: ${total}
📄 Page: ${page}/${totalPages}

`;
      cards.forEach((card, i) => {
        text += `${skip + i + 1}. *${card.name} - ${card.cardId}*\n`;
      });

      text += `\nUse: .clist <tier> <page>`;

      return reply(text);

    } catch (err) {
      console.error("CLIST ERROR:", err);
      return reply("❌ Failed to load card list.");
    }
  },
};
