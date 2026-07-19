import { Col, findOrCreateUser } from "./db.js";

// Shared global so spawner can write and this command can read
const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

export default {
  name: "claim",
  aliases: ["catch", "collect"],
  category: "cards",
  description: "Claim a spawned card — first come, first served!",
  usage: ".claim <card_id>",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const cardIdInput = (args[0] || "").toUpperCase();
      if (!cardIdInput) return reply("❌ Usage: .claim <card_id>");

      const spawn = activeSpawns[jid];
      if (!spawn) return reply("❌ No active card spawn in this chat.");

      if (spawn.cardId !== cardIdInput) return reply("❌ Wrong Card ID! Try again.");

      const card = await Col.cards().findOne({ cardId: spawn.cardId });
      if (!card) {
        delete activeSpawns[jid];
        return reply("❌ That card no longer exists.");
      }

      const user = await findOrCreateUser(sender);
      user.cards = user.cards || [];

      user.cards.push({
        cardId:      card.cardId,
        name:        card.name,
        tier:        card.tier,
        price:       card.price || 0,
        description: card.description || "",
        series:      card.series || "",
        media:       card.media || null,
        mediaType:   card.mediaType || "image",
        obtainedAt:  new Date(),
      });

      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();

      // Update claim count on the card
      await Col.cards().updateOne(
        { cardId: card.cardId },
        { $inc: { timesClaimed: 1 } }
      );

      delete activeSpawns[jid];

      return await sock.sendMessage(jid, {
        text:
`🎴 *CARD CLAIMED!*

@${sender.split("@")[0]} claimed *${card.name}*!
⭐ Tier: *${card.tier}*

Well done — card added to your collection!`,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return reply("❌ Claim failed. Please try again.");
    }
  },
};
