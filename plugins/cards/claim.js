import { findOrCreateUser } from "./db.js";
import { resolveMediaUrl } from "../../lib/cardApi.mjs";

// Shared global so spawner can write and this command can read
const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

export default {
  name: "claim",
  aliases: ["catch", "collect"],
  category: "cards",
  description: "Claim a spawned card — first come, first served!",
  usage: ".claim <card_id>",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const cardIdInput = (args[0] || "").toUpperCase();
      if (!cardIdInput) return reply("❌ Usage: .claim <card_id>");

      const spawn = activeSpawns[jid];
      if (!spawn) return reply("❌ No active card spawn in this chat.");
      if (spawn.cardId !== cardIdInput) return reply("❌ Wrong Card ID! Try again.");

      // Card data is stored in activeSpawns by the spawner — no DB lookup needed
      const card = spawn.card;
      if (!card) {
        delete activeSpawns[jid];
        return reply("❌ That card no longer exists.");
      }

      const user = await findOrCreateUser(sender);
      user.cards = user.cards || [];

      user.cards.push({
        cardId:     card.cardId,
        name:       card.name,
        tier:       card.tier,
        tierNum:    card.tierNum,
        price:      card.price  || 0,
        series:     card.series || "Unknown",
        media:      card.media  || null,
        mediaType:  "image",
        obtainedAt: new Date(),
      });

      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();

      delete activeSpawns[jid];

      if (card.media) {
        const imgUrl = await resolveMediaUrl(card.media);
        return sock.sendMessage(jid, {
          image:   { url: imgUrl },
          caption:
`🎴 *CARD CLAIMED!*

@${sender.split("@")[0]} claimed *${card.name}*!
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*

Well done — card added to your collection!`,
          mentions: [sender],
        }, { quoted: msg });
      }

      return sock.sendMessage(jid, {
        text:
`🎴 *CARD CLAIMED!*

@${sender.split("@")[0]} claimed *${card.name}*!
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*

Well done — card added to your collection!`,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return reply("❌ Claim failed. Please try again.");
    }
  },
};
