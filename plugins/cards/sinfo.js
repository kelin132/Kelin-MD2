import { Col } from "./db.js";

export default {
  name: "sinfo",
  aliases: ["marketinfo", "cardlisting"],
  category: "cards",
  description: "View info about a card listing in the marketplace",
  usage: ".sinfo <index>",

  async run({ sock, msg, args }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const index  = parseInt(args[0]) - 1;
      const market = await Col.market();
      const [cards, total] = await Promise.all([
        Number.isInteger(index) && index >= 0
          ? market.find(
              {},
              { projection: { cardName: 1, cardRarity: 1, price: 1, sellerId: 1, listedAt: 1 } },
            ).sort({ listedAt: 1, _id: 1 }).skip(index).limit(1).toArray()
          : Promise.resolve([]),
        market.countDocuments(),
      ]);

      if (!Number.isInteger(index) || index < 0 || !cards[0]) {
        return reply(`❌ Invalid index. There are ${total} active listing(s).`);
      }

      const c    = cards[0];
      const text =
`ℹ️ *CARD LISTING INFO*

📛 Name: ${c.cardName}
💎 Rarity: ${c.cardRarity}
💰 Price: $${Number(c.price).toLocaleString()}
👤 Seller: @${c.sellerId}
📅 Listed: ${new Date(c.listedAt).toDateString()}`;

      return reply(text);

    } catch (err) {
      console.error("SINFO ERROR:", err);
      return reply("❌ Failed to get card info.");
    }
  },
};
