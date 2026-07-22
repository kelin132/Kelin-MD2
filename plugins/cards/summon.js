/**
 * KELIN MD — .summon
 * Summon a random card from any tier (or a specific tier) and claim it instantly. FREE.
 *
 * Usage:
 *   .summon           — random tier summon (free)
 *   .summon <tier>    — specific tier (1-5 or Common/Uncommon/Rare/Epic/Legendary)
 */
import { findOrCreateUser } from "./db.js";
import {
  fetchAllCards,
  getCardsByTier,
  pickRandomCard,
  resolveMediaUrl,
  TIER_EMOJI,
  TIER_NUM,
  TIER_NAME,
} from "../../lib/cardApi.mjs";

// Weighted random tier for "random" summon (bias towards lower tiers)
const RANDOM_TIER_WEIGHTS = [
  { tier: "Common",    weight: 45 },
  { tier: "Uncommon",  weight: 25 },
  { tier: "Rare",      weight: 15 },
  { tier: "Epic",      weight:  8 },
  { tier: "Legendary", weight:  7 },
];
const TOTAL_WEIGHT = RANDOM_TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);

function rollRandomTier() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const t of RANDOM_TIER_WEIGHTS) {
    r -= t.weight;
    if (r <= 0) return t.tier;
  }
  return "Common";
}

function resolveTierName(input) {
  if (!input) return null;
  const lower = input.toLowerCase();
  // Number input: 1-5
  if (TIER_NAME[lower]) return TIER_NAME[lower];
  // Name input
  const found = Object.values(TIER_NAME).find(n => n.toLowerCase() === lower);
  return found || null;
}

export default {
  name: "summon",
  aliases: ["nsummon", "cardsummon", "pull"],
  category: "cards",
  description: "Summon and instantly claim a card for free",
  usage: ".summon [tier]  — e.g. .summon  |  .summon rare  |  .summon 5",

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      // Help
      if ((args[0] || "").toLowerCase() === "help") {
        return reply(
`🔮 *SUMMON SYSTEM*

Summon & instantly claim a card — completely free!

📖 *Usage:*
  *.summon*           — random tier
  *.summon 1*         — Common
  *.summon 2*         — Uncommon
  *.summon 3*         — Rare
  *.summon 4*         — Epic
  *.summon 5*         — Legendary
  *.summon legendary* — Legendary by name`
        );
      }

      // Resolve tier
      let tierName;
      let isRandom = false;
      if (!args[0]) {
        isRandom = true;
        tierName = rollRandomTier();
      } else {
        tierName = resolveTierName(args[0]);
        if (!tierName) {
          return reply(`❌ Unknown tier "*${args[0]}*".\n\nValid tiers: 1-5 or Common/Uncommon/Rare/Epic/Legendary\n\nType *.summon help* for details.`);
        }
      }

      const emoji = TIER_EMOJI[tierName] || "⭐";

      // Fetch a card from the resolved tier
      const pool = await getCardsByTier(TIER_NUM[tierName.toLowerCase()] || "1");
      if (!pool || pool.length === 0) {
        return reply(`❌ No cards available for tier *${tierName}* right now. Try again later.`);
      }

      const card = pool[Math.floor(Math.random() * pool.length)];

      // Add card to user's collection
      const cardUser = await findOrCreateUser(sender);
      cardUser.cards = cardUser.cards || [];

      if (cardUser.cards.length >= (cardUser.cardLimit || 100)) {
        return reply(`❌ Your card collection is full! (${cardUser.cards.length}/${cardUser.cardLimit || 100})\n\nDelete some cards with *.delc <index>* to make room.`);
      }

      cardUser.cards.push({
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

      cardUser.totalCards = (cardUser.totalCards || 0) + 1;
      await cardUser.save();

      const claimText =
`✨ *SUMMON SUCCESS!* ${emoji}

🃏 *${card.name}*
⭐ Tier: *${card.tier}*
📺 Series: *${card.series}*
${isRandom ? `🎲 You rolled a *${tierName}* tier summon!\n` : ""}
Card added to your collection!

Use *.col* to view your cards.`;

      if (card.media) {
        try {
          const imgUrl = await resolveMediaUrl(card.media);
          return sock.sendMessage(jid, {
            image:    { url: imgUrl },
            caption:  claimText,
            mentions: [sender],
          }, { quoted: msg });
        } catch { /* fall through to text */ }
      }

      return sock.sendMessage(jid, {
        text:     claimText,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("SUMMON ERROR:", err);
      return reply("❌ Summon failed. Please try again.");
    }
  },
};
