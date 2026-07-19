import { Col, findOrCreateUser } from "./database.js";

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
      const index  = parseInt(args[0]) - 1;
      const userId = sender.split("@")[0];
      const cards  = await Col.market().find({ sellerId: userId }).toArray();

      if (isNaN(index) || !cards[index]) {
        return reply(`❌ Invalid index. You have ${cards.length} listing(s). Use .vs to check.`);
      }

      const card = cards[index];
      const user = await findOrCreateUser(sender);

      user.cards.push({
        cardId:    card.cardId,
        name:      card.cardName,
        tier:      card.cardRarity,
        media:     card.cardImage || null,
        obtainedAt: new Date(),
      });
      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();

      await Col.market().deleteOne({ _id: card._id });

      return reply(`✅ Successfully removed *${card.cardName}* [${card.cardRarity}] from the market and returned it to your collection.`);

    } catch (err) {
      console.error("RC ERROR:", err);
      return reply("❌ Failed to remove listing.");
    }
  },
};
