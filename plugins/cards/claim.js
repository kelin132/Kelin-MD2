import { findOrCreateUser } from "./db.js";
import { sendCardMedia } from "../../lib/cardApi.mjs";

const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

export default {
  name: "claim",
  aliases: ["collect"],
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



      user.cards.push({
        cardId:     card.cardId,
        name:       card.name,
        tier:       card.tier,
        tierNum:    card.tierNum || card.tier,
        index:      card.index || null,
        spawnId:    spawn.spawnId || card.cardId,
        price:      card.price  || 0,
        series:     card.series || "Unknown",
        media:      card.media  || null,
        mediaType:  (card.tierNum === "6" || card.tierNum === "S") ? "gif" : "image",
        obtainedAt: new Date(),
      });

      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();
      delete activeSpawns[jid];

      const claimText =
`꧁━━〔 🎴 *C A R D  C L A I M E D!* 〕━━꧂

  「 *@${sender.split("@")[0]} snagged it first!* 」 🎉

  ━━━━━━━━━━━━━━━━━━━━━━━
  ✨ *${card.name}*
  ⭐ *Tier*    *${card.tier}*
  📺 *Series*  *${card.series}*
  ━━━━━━━━━━━━━━━━━━━━━━━

  🃏 *Added to your collection!*
  Use *.col* to view it.

꧂━━━━━━━━━━━━━━━━━━━━━━━━━━꧁`;

      if (card.media) {
        try {
          return sendCardMedia(sock, jid, card, claimText, { quoted: msg, mentions: [sender] });
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
