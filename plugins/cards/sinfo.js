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
      const cards  = await market.find().toArray();

      if (isNaN(index) || !cards[index]) return reply(`❌ Invalid index. There are ${cards.length} active listing(s).`);

      const c    = cards[index];
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
