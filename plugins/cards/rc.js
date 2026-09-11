import { Col, findOrCreateUser } from "./db.js";

export default {
  name: "rc",
  aliases: ["removelisting", "unlist"],
  category: "cards",
  description: "Remove one of your marketplace card listings",
  usage: ".rc <index>",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const index   = parseInt(args[0]) - 1;
      const userId  = sender.split("@")[0];
      const market  = await Col.market();
      const [cards, total] = await Promise.all([
        Number.isInteger(index) && index >= 0
          ? market.find(
              { sellerId: userId },
              { projection: { cardId: 1, cardName: 1, cardRarity: 1, cardImage: 1, listedAt: 1 } },
            ).sort({ listedAt: 1, _id: 1 }).skip(index).limit(1).toArray()
          : Promise.resolve([]),
        market.countDocuments({ sellerId: userId }),
      ]);

      if (!Number.isInteger(index) || index < 0 || !cards[0]) {
        return reply(`❌ Invalid index. You have ${total} listing(s). Use .vs to check.`);
      }

      const card = cards[0];
      const user = await findOrCreateUser(sender);

      user.cards.push({
        cardId:     card.cardId,
        name:       card.cardName,
        tier:       card.cardRarity,
        media:      card.cardImage || null,
        obtainedAt: new Date(),
      });
      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();

      await market.deleteOne({ _id: card._id });

      return reply(`✅ Successfully removed *${card.cardName}* [${card.cardRarity}] from the market and returned it to your collection.`);

    } catch (err) {
      console.error("RC ERROR:", err);
      return reply("❌ Failed to remove listing.");
    }
  },
};
