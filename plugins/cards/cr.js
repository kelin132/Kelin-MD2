import { findOrCreateUser, fmt, tag } from "./db.js";

// In-memory trade requests — keyed by jid+target so each chat is isolated
const tradeRequests = new Map();

export default {
  name: "cr",
  aliases: ["cardsell", "sellto"],
  category: "cards",
  description: "Sell a card directly to another user  |  .cr accept to buy",
  usage: ".cr <price> <index> @user  |  .cr accept",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const sub = (args[0] || "").toLowerCase();

      // ── ACCEPT ──────────────────────────────────────────────────────────────
      if (sub === "accept") {
        const req = tradeRequests.get(jid + sender);
        if (!req) return reply("❌ You don't have any pending card purchase requests.");

        const seller = await findOrCreateUser(req.seller);
        const buyer  = await findOrCreateUser(req.buyer);

        if (buyer.balance < req.price) {
          tradeRequests.delete(jid + sender);
          return reply("❌ You don't have enough balance to buy this card.");
        }

        // Verify seller still has the card (by cardId + index)
        const cardIdx = seller.cards.findIndex((c, i) => i === req.cardIndex && c.cardId === req.cardId);
        if (cardIdx === -1) {
          tradeRequests.delete(jid + sender);
          return reply("❌ The seller no longer has this card.");
        }

        const card = seller.cards[cardIdx];
        buyer.balance  -= req.price;
        seller.balance  = (seller.balance || 0) + req.price;

        seller.cards.splice(cardIdx, 1);
        buyer.cards.push(card);

        await seller.save();
        await buyer.save();
        tradeRequests.delete(jid + sender);

        return await sock.sendMessage(jid, {
          text:
`🤝 *CARD TRADE COMPLETE*

🃏 Card: *${card.name}*
💰 Price: *$${fmt(req.price)}*

📤 Seller: ${tag(req.seller)}
📥 Buyer: ${tag(req.buyer)}`,
          mentions: [req.seller, req.buyer],
        }, { quoted: msg });
      }

      // ── CREATE REQUEST ───────────────────────────────────────────────────────
      const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                  || msg.message?.extendedTextMessage?.contextInfo?.participant;

      if (!target) {
        return reply("❌ Mention or reply to a user to sell them a card.\nUsage: .cr <price> <index> @user");
      }

      if (target === sender) return reply("❌ You can't sell a card to yourself.");

      const price = parseInt(args[0]);
      const index = parseInt(args[1]) - 1;

      if (isNaN(price) || price <= 0 || isNaN(index) || index < 0) {
        return reply("❌ Usage: .cr <price> <index> @user");
      }

      const sellerUser = await findOrCreateUser(sender);
      if (!sellerUser.cards || index >= sellerUser.cards.length) {
        return reply("❌ Invalid card index. Use .col to see your cards.");
      }

      const card = sellerUser.cards[index];
      if (card.locked || card.inAuction) return reply("❌ This card is locked or in auction.");

      tradeRequests.set(jid + target, {
        seller:    sender,
        buyer:     target,
        cardId:    card.cardId,
        cardIndex: index,
        price,
        time: Date.now(),
      });

      setTimeout(() => tradeRequests.delete(jid + target), 60_000);

      return await sock.sendMessage(jid, {
        text:
`💰 ${tag(target)}, ${tag(sender)} wants to sell you their card:

🃏 Card: *${card.name}*
⭐ Tier: *${card.tier}*
💵 Price: *$${fmt(price)}*

> Type *.cr accept* to buy this card.
> _Expires in 60 seconds._`,
        mentions: [sender, target],
      }, { quoted: msg });

    } catch (err) {
      console.error("CR CMD ERROR:", err);
      return reply("❌ Error processing card sale request.");
    }
  },
};
