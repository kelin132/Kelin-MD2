/**
 * .resell <index> [amount]
 * Sell one card (or multiple duplicates) back to the bot for 50% of its value.
 * Payout lands in the user's economy wallet.
 */
import { findOrCreateUser } from "./db.js";
import { TIER_EMOJI } from "../../lib/cardApi.mjs";
import {
  getUser    as getEconomyUser,
  saveUser   as saveEconomyUser,
  addHistory,
  isRegistered,
} from "../economy/database.js";

// Fallback resell prices per tier (used if card.price is missing)
const RESELL_BASE = {
  Common:    200,
  Uncommon:  800,
  Rare:      4000,
  Epic:      15000,
  Legendary: 55000,
};

const PAYOUT_RATE = 0.5; // 50 % of card's stored value
const RESELL_COOLDOWN_MS = 13_000;
const resellCooldowns = new Map();

export default {
  name:        "resell",
  aliases:     ["sellback", "rsell"],
  category:    "cards",
  description: "Sell a card back to the bot for 50% of its value",
  usage:       ".resell <index>",
  cooldown:    13,

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      // ── Validate args ────────────────────────────────────────────────────
      if (!args[0]) {
        return reply(
`💰 *RESELL A CARD*

Sell a card back to the bot for *50%* of its value.
Payout is added to your economy wallet.

📌 Usage: *.resell <index>*
📋 View your cards: *.col*

Example: \`.resell 3\``
        );
      }

      const now = Date.now();
      const lastResell = resellCooldowns.get(sender);
      if (lastResell !== undefined) {
        const elapsed = now - lastResell;
        if (elapsed < RESELL_COOLDOWN_MS) {
          const remaining = Math.ceil((RESELL_COOLDOWN_MS - elapsed) / 1000);
          return reply(`⏳ *Resell cooldown active!*\n\nPlease wait *${remaining}s* before selling another card.`);
        }
        resellCooldowns.delete(sender);
      }

      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0) {
        return reply("❌ Invalid index. Use *.col* to see your cards and their numbers.");
      }

      // ── Check economy registration ────────────────────────────────────────
      const registered = await isRegistered(sender);
      if (!registered) {
        return reply("❌ You need an economy account to receive the payout.\n\nUse *.register <your name>* first.");
      }

      // ── Load card user ────────────────────────────────────────────────────
      const cardUser = await findOrCreateUser(sender);

      if (!Array.isArray(cardUser.cards) || cardUser.cards.length === 0) {
        return reply("❌ You don't have any cards to sell.\n\nWait for a spawn and use *.claim <ID>* to collect one!");
      }

      if (index >= cardUser.cards.length) {
        return reply(`❌ Invalid index. You only have *${cardUser.cards.length}* card(s).\nUse *.col* to check.`);
      }

      // ── Calculate payout ──────────────────────────────────────────────────
      const card      = cardUser.cards[index];
      const cardName  = card.name  || "Unknown Card";
      const cardTier  = card.tier  || "Common";
      const cardEmoji = TIER_EMOJI[cardTier] || "⭐";
      const baseValue = card.price || RESELL_BASE[cardTier] || 200;
      const payout    = Math.floor(baseValue * PAYOUT_RATE);

      // Start the cooldown only after all request/card validation succeeds.
      resellCooldowns.set(sender, now);

      // ── Remove card from collection ───────────────────────────────────────
      cardUser.cards.splice(index, 1);
      cardUser.totalCards = Math.max(0, (cardUser.totalCards || 1) - 1);
      await cardUser.save();

      // ── Credit economy wallet ─────────────────────────────────────────────
      const econUser  = await getEconomyUser(sender);
      econUser.money  = (econUser.money || 0) + payout;
      await saveEconomyUser(sender, econUser);
      await addHistory(sender, "resell", payout, `Sold card: ${cardName}`);

      return reply(
`✅ *CARD SOLD!*

🃏 *${cardName}*
${cardEmoji} Tier: ${cardTier}
💵 Market Value: $${baseValue.toLocaleString()}

💰 You received: *$${payout.toLocaleString()}* (50%)
   → Added to your wallet

💳 New Balance: $${econUser.money.toLocaleString()}

_Tip: Higher rarity cards sell for more. Use .col to see your collection._`
      );

    } catch (err) {
      console.error("RESELL ERROR:", err);
      return reply("❌ Failed to resell card. Please try again.");
    }
  },
};
