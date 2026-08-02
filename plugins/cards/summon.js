/**
 * KELIN MD — .summon
 * Summon a random card from any tier (or a specific tier).
 * Costs coins from the user's card balance based on the tier summoned.
 *
 * Usage:
 *   .summon           — random tier summon
 *   .summon <tier>    — specific tier (1-6 or Common/Uncommon/Rare/Epic/Legendary/Mythical)
 */
import { findOrCreateUser } from "./db.js";
import { getUser, saveUser, requireRegistration, addHistory } from "../economy/database.js";
import {
  getCardsByTier,
  sendCardMedia,
  TIER_EMOJI,
  TIER_NUM,
  TIER_NAME,
  createSpawnId,
} from "../../lib/cardApi.mjs";

// ── Summon costs by tier ──────────────────────────────────────────────────────
// Higher tiers cost more coins from the user's card balance.

export const SUMMON_COST = {
  Common:    10000,
  Uncommon:  50000,
  Rare:      100000,
  Epic:      150000,
  Legendary: 200000,
  Mythical:  300000,
};

// ── Weighted random tier (bias towards lower tiers) ───────────────────────────

const RANDOM_TIER_WEIGHTS = [
  { tier: "Common",    weight: 40 },
  { tier: "Uncommon",  weight: 25 },
  { tier: "Rare",      weight: 18 },
  { tier: "Epic",      weight: 10 },
  { tier: "Legendary", weight:  5 },
  { tier: "Mythical",  weight:  2 },
];
const TOTAL_WEIGHT = RANDOM_TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);
const SUMMON_COOLDOWN_MS = 20_000;
const summonCooldowns = new Map();

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
  if (TIER_NAME[lower]) return TIER_NAME[lower];
  const found = Object.values(TIER_NAME).find(n => n.toLowerCase() === lower);
  return found || null;
}

export default {
  name: "summon",
  aliases: ["nsummon", "cardsummon", "pull"],
  category: "cards",
  description: "Summon and instantly claim a card — costs coins based on tier",
  usage: ".summon [tier]  — e.g. .summon  |  .summon rare  |  .summon 5  |  .summon mythical",
  cooldown: 20,

  async run({ sock, msg, args, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      // Help
      if ((args[0] || "").toLowerCase() === "help") {
        return reply(
`╭━━━〔 🔮 𝑺𝑼𝑴𝑴𝑶𝑵 𝑺𝒀𝑺𝑻𝑬𝑴 ✨ 〕━━━╮
┃ ✦ Summon & instantly claim a card!
┃ ✦ Costs coins per tier from your wallet.
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━
┃ 💰 𝗦𝘂𝗺𝗺𝗼𝗻 𝗖𝗼𝘀𝘁𝘀
┃
┃ ⚪ T1 Common     › $${SUMMON_COST.Common.toLocaleString()}
┃ 🟢 T2 Uncommon   › $${SUMMON_COST.Uncommon.toLocaleString()}
┃ 🔵 T3 Rare       › $${SUMMON_COST.Rare.toLocaleString()}
┃ 🟣 T4 Epic       › $${SUMMON_COST.Epic.toLocaleString()}
┃ 🟡 T5 Legendary  › $${SUMMON_COST.Legendary.toLocaleString()}
┃ 🔴 T6 Mythical   › $${SUMMON_COST.Mythical.toLocaleString()}
┃
┣━━━━━━━━━━━━━━━━━━━━━━━━
┃ 📖 𝗨𝘀𝗮𝗴𝗲
┃
┃ .summon          — random tier
┃ .summon 1        — Common (T1)
┃ .summon 2        — Uncommon (T2)
┃ .summon 3        — Rare (T3)
┃ .summon 4        — Epic (T4)
┃ .summon 5        — Legendary (T5)
┃ .summon 6        — Mythical (T6)
┃ .summon mythical — Mythical by name
┃
┃ 💡 Earn coins via .daily .work .crime
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      const now = Date.now();
      const lastSummon = summonCooldowns.get(sender);
      if (lastSummon) {
        const elapsed = now - lastSummon;
        if (elapsed < SUMMON_COOLDOWN_MS) {
          const remaining = Math.ceil((SUMMON_COOLDOWN_MS - elapsed) / 1000);
          return reply(
`╭━━━〔 ⏳ 𝑪𝑶𝑶𝑳𝑫𝑶𝑾𝑵 〕━━━╮
┃ ✦ Summon is on cooldown!
┃
┃ ⏱ Wait › 『 ${remaining}s 』
┃
┃ The cards need time to rest...
╰━━━━━━━━━━━━━━━━━━━━╯`
          );
        }
        summonCooldowns.delete(sender);
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
          return reply(
`╭━━━〔 ❌ 𝑰𝑵𝑽𝑨𝑳𝑰𝑫 𝑻𝑰𝑬𝑹 〕━━━╮
┃ ✦ Unknown tier: 『 ${args[0]} 』
┃
┃ Valid tiers:
┃ 1-6 or Common / Uncommon / Rare
┃ Epic / Legendary / Mythical
┃
┃ 💡 Type .summon help for details
╰━━━━━━━━━━━━━━━━━━━━╯`
          );
        }
      }

      // Start the cooldown only for a valid summon attempt.
      summonCooldowns.set(sender, now);

      const emoji = TIER_EMOJI[tierName] || "⭐";
      const cost  = SUMMON_COST[tierName] || SUMMON_COST.Common;

      // ── Require economy registration ────────────────────────────────────────
      if (!await requireRegistration(sock, msg, sender)) return;

      // ── Check economy wallet ────────────────────────────────────────────────
      const ecoUser = await getUser(sender);

      if ((ecoUser.money || 0) < cost) {
        return reply(
`╭━━━〔 💸 𝑰𝑵𝑺𝑼𝑭𝑭𝑰𝑪𝑰𝑬𝑵𝑻 𝑭𝑼𝑵𝑫𝑺 〕━━━╮
┃ ✦ Not enough coins to summon!
┃
┃ ${emoji} Tier   ➜ 『 ${tierName} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Required › $${cost.toLocaleString()}
┃ 👛 Wallet   › $${(ecoUser.money || 0).toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 Earn via .daily .work .crime
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      // Deduct from economy wallet
      ecoUser.money -= cost;
      await saveUser(sender, ecoUser);

      // Log transaction history
      await addHistory(sender, "summon", -cost, `Summoned ${tierName} card`);

      // ── Fetch a card from the resolved tier ─────────────────────────────────
      const pool = await getCardsByTier(TIER_NUM[tierName.toLowerCase()] || "1");
      if (!pool || pool.length === 0) {
        // Refund if no cards available
        ecoUser.money += cost;
        await saveUser(sender, ecoUser);
        await addHistory(sender, "summon_refund", cost, `Refund — no ${tierName} cards available`);
        return reply(
`╭━━━〔 ❌ 𝑵𝑶 𝑪𝑨𝑹𝑫𝑺 𝑨𝑽𝑨𝑰𝑳𝑨𝑩𝑳𝑬 〕━━━╮
┃ ✦ No cards found for this tier!
┃
┃ ${emoji} Tier ➜ 『 ${tierName} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💰 Refunded › $${cost.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 Try again later!
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      const card = pool[Math.floor(Math.random() * pool.length)];

      // ── Add card to collection ──────────────────────────────────────────────
      const cardUser = await findOrCreateUser(sender);
      cardUser.cards = cardUser.cards || [];

      cardUser.cards.push({
        cardId:     card.cardId,
        name:       card.name,
        tier:       card.tier,
        tierNum:    card.tierNum || card.tier,
        index:      card.index || null,
        spawnId:    createSpawnId(),
        price:      card.price  || 0,
        series:     card.series || "Unknown",
        media:      card.media  || null,
        mediaType:  (card.tierNum === "6" || card.tierNum === "S") ? "gif" : "image",
        obtainedAt: new Date(),
      });

      cardUser.totalCards = (cardUser.totalCards || 0) + 1;
      await cardUser.save();

      const claimText =
`╭━━━〔 ${emoji} 𝑺𝑼𝑴𝑴𝑶𝑵 𝑺𝑼𝑪𝑪𝑬𝑺𝑺 ✨ 〕━━━╮
┃ ✦ A card has appeared from the ether...
┃${isRandom ? `\n┃ 🎲 Roll  ➜ 『 ${tierName} Tier 』` : ""}
┃ 🃏 Card  ➜ 『 ${card.name} 』
┃ ${emoji} Tier  ➜ 『 ${card.tier} 』
┃ 📺 Series ➜ 『 ${card.series} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💸 Cost   › $${cost.toLocaleString()}
┃ 👛 Wallet › $${ecoUser.money.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ 🎉 𝗖𝗟𝗔𝗜𝗠𝗘𝗗!
┃ Card added to your collection!
┃ Use .col to view your cards.
╰━━━━━━━━━━━━━━━━━━━━╯`;

      if (card.media) {
        try {
          return await sendCardMedia(
            sock,
            jid,
            card,
            claimText,
            { quoted: msg, mentions: [sender] },
          );
        } catch { /* fall through to text */ }
      }

      return sock.sendMessage(jid, {
        text:     claimText,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("SUMMON ERROR:", err);
      return reply(
`╭━━━〔 ❌ 𝑬𝑹𝑹𝑶𝑹 〕━━━╮
┃ ✦ Summon failed!
┃
┃ Please try again later.
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }
  },
};
