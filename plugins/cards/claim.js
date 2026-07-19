import { findOrCreateUser } from "./db.js";
import { resolveMediaUrl } from "../../lib/cardApi.mjs";

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

      // card may be undefined if the bot is running an old spawner build
      const card = spawn.card;
      if (!card) {
        delete activeSpawns[jid];
        return reply(
`❌ This spawn was created before the latest update.

The bot needs to *restart* for spawns to work properly with the new card system.
Ask an admin to restart the bot, then wait for the next auto-spawn.`
        );
      }

      const user = await findOrCreateUser(sender);
      user.cards = user.cards || [];

      if (user.cards.length >= (user.cardLimit || 100)) {
        return reply(`❌ Your card collection is full! (${user.cards.length}/${user.cardLimit || 100})\n\nDelete some cards with *.delc <index>* to make room.`);
      }

      user.cards.push({
        cardId:     card.cardId,
        name:       card.name,
        tier:       card.tier,
        tierNum:    card.tierNum || card.tier,
        price:      card.price  || 0,
        series:     card.series || "Unknown",
        media:      card.media  || null,
        mediaType:  "image",
        obtainedAt: new Date(),
      });

      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();
      delete activeSpawns[jid];

      const claimText =
`🎴 *CARD CLAIMED!*

@${sender.split("@")[0]} snagged *${card.name}*!
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*

Card added to your collection! Use *.col* to view it.`;

      if (card.media) {
        try {
          const imgUrl = await resolveMediaUrl(card.media);
          return sock.sendMessage(jid, {
            image:    { url: imgUrl },
            caption:  claimText,
            mentions: [sender],
          }, { quoted: msg });
        } catch { /* fall through */ }
      }

      return sock.sendMessage(jid, {
        text:     claimText,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return reply("❌ Claim failed. Please try again.");
    }
  },
};
