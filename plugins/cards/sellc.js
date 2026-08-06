import { Col, findOrCreateUser } from "./db.js";

export default {
  name: "sellc",
  aliases: ["listcard", "cardmarket"],
  category: "cards",
  description: "List one of your cards for sale in the marketplace",
  usage: ".sellc <index> <price>",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const index = parseInt(args[0]) - 1;
      const price = parseInt(args[1]);

      if (isNaN(index) || index < 0) return reply("❌ Usage: .sellc <index> <price>");
      if (isNaN(price) || price <= 0) return reply("❌ Please provide a valid price.");

      const user = await findOrCreateUser(sender);
      if (!user.cards || !user.cards[index]) return reply("❌ Invalid card index. Use .col to check.");

      const card   = user.cards[index];
      const market = await Col.market();

      await market.insertOne({
        sellerId:   sender.split("@")[0],
        cardId:     card.cardId,
        cardName:   card.name || "Unknown Card",
        cardImage:  card.media || null,
        cardRarity: card.tier  || "Common",
        price,
        listedAt:   new Date(),
      });

      user.cards.splice(index, 1);
      user.totalCards = Math.max(0, (user.totalCards || 1) - 1);
      await user.save();

      return reply(`✅ Listed *${card.name || "Unknown Card"}* for $${price.toLocaleString()} in the market!\n\nUse .vs to see your listings.`);

    } catch (err) {
      console.error("SELLC ERROR:", err);
      return reply("❌ Failed to list card.");
    }
  },
};
