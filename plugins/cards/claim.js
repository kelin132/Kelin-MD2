import { findOrCreateUser } from "./db.js";
import { sendCardMedia } from "../../lib/cardApi.mjs";

const activeSpawns = global.activeSpawns || (global.activeSpawns = {});

function toOwnedCard(card, spawnId) {
  return {
    cardId:     card.cardId,
    name:       card.name,
    tier:       card.tier,
    tierNum:    card.tierNum || card.tier,
    index:      card.index || null,
    spawnId:    spawnId || card.spawnId || card.cardId,
    price:      card.price || 0,
    series:     card.series || "Unknown",
    media:      card.media || null,
    mediaType:  (card.tierNum === "6" || card.tierNum === "S") ? "gif" : "image",
    obtainedAt: new Date(),
  };
}

function claimText(card, sender, prefix = "𝐂𝐀𝐑𝐃 𝐂𝐋𝐀𝐈𝐌𝐄𝐃") {
  return `╭─❀「 🃏 *${prefix}* 」❀─╮
│ 👤 *Claimed by* :: @${sender.split("@")[0]}
│
│ 🃏 *Name*      :: \`${card.name}\`
│ ⭐ *Tier*      :: \`${card.tier}\`
│ 📺 *Series*    :: \`${card.series}\`
│ 🆔 *ID*        :: \`${card.cardId}\`
│
│ ✅ Added to your collection!
│ 💬 Use \`.col\` to view it.
╰───────────────❀`;
}

export default {
  name: "claim",
  aliases: ["collect"],
  category: "cards",
  description: "Claim your pending summon, spawn pack, or spawned card",
  usage: ".claim [card_id]",

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const cardIdInput = (args[0] || "").toUpperCase();
      const user = await findOrCreateUser(sender);
      user.cards = Array.isArray(user.cards) ? user.cards : [];
      user.pendingCards = Array.isArray(user.pendingCards) ? user.pendingCards : [];

      // Personal pending claims created by .summon or .spawnpack.
      const hasMatchingPending = cardIdInput
        ? user.pendingCards.some((card) => String(card.cardId || "").toUpperCase() === cardIdInput)
        : user.pendingCards.length > 0;
      if (hasMatchingPending) {
        const selected = cardIdInput
          ? user.pendingCards.filter((card) => String(card.cardId || "").toUpperCase() === cardIdInput).slice(0, 1)
          : user.pendingCards.slice();

        user.cards.push(...selected.map((card) => toOwnedCard(card, card.spawnId)));
        user.totalCards = (user.totalCards || 0) + selected.length;
        const selectedIds = new Set(selected.map((card) => card.spawnId || card.cardId));
        user.pendingCards = user.pendingCards.filter(
          (card) => !selectedIds.has(card.spawnId || card.cardId),
        );
        await user.save();

        const first = selected[0];
        const text = selected.length === 1
          ? claimText(first, sender)
          : `╭─❀「 📦 *𝐏𝐀𝐂𝐊 𝐂𝐋𝐀𝐈𝐌𝐄𝐃* 」❀─╮
│ 👤 *Claimed by* :: @${sender.split("@")[0]}
│
│ 🃏 *Cards added* :: \`${selected.length}\`
│ ✨ Your pending summon cards are now in your collection.
│ 💬 Use \`.col\` to view them.
╰───────────────❀`;

        if (first?.media) {
          try {
            return await sendCardMedia(sock, jid, first, text, { quoted: msg, mentions: [sender] });
          } catch { /* fall through to text */ }
        }
        return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
      }

      // Preserve the existing chat-wide auto-spawn claim flow.
      if (!cardIdInput) return reply("❌ No pending summon or card spawn.\n\nUse \`.claim <card_id>\` for a chat spawn.");
      const spawn = activeSpawns[jid];
      if (!spawn) return reply("❌ No active card spawn in this chat.");
      if (spawn.cardId !== cardIdInput) return reply("❌ Wrong Card ID! Try again.");

      const card = spawn.card;
      if (!card) {
        delete activeSpawns[jid];
        return reply("❌ This card spawn is no longer available. Wait for the next spawn.");
      }

      user.cards.push(toOwnedCard(card, spawn.spawnId));
      user.totalCards = (user.totalCards || 0) + 1;
      await user.save();
      delete activeSpawns[jid];

      const text = claimText(card, sender);
      if (card.media) {
        try {
          return await sendCardMedia(sock, jid, card, text, { quoted: msg, mentions: [sender] });
        } catch { /* fall through to text */ }
      }
      return sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return reply("❌ Claim failed. Please try again.");
    }
  },
};
