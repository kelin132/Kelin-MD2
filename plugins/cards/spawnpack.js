/**
 * KELIN MD — .spawnpack
 * Buy a spawn pack containing a bundle of cards at a discounted price.
 * The bundle is held as a pending claim until the buyer runs .claim.
 *
 * Pack contents:
 *   2 × Tier 6 (Mythical)
 *   2 × Tier 5 (Legendary)
 *   3 × Tier 4 (Epic)
 *   4 × Tier 3 (Rare)
 *   4 × Tier 2 (Uncommon)
 *
 * Total: 15 cards — costs 2,000,000 coins
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

const PACK_COST = 20_000_000;

const PACK_CONTENTS = [
  { tierName: "Mythical",  count: 2 },
  { tierName: "Legendary", count: 2 },
  { tierName: "Epic",      count: 3 },
  { tierName: "Rare",      count: 4 },
  { tierName: "Uncommon",  count: 4 },
];

const TOTAL_CARDS = PACK_CONTENTS.reduce((s, p) => s + p.count, 0);

const PACK_COOLDOWN_MS = 60_000; // 1 minute between pack purchases
const packCooldowns = new Map();

async function drawCardsForTier(tierName, count) {
  const tierNum = TIER_NUM[tierName.toLowerCase()] || "1";
  const pool    = await getCardsByTier(tierNum);
  if (!pool || pool.length === 0) return [];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    drawn.push({ ...pool[Math.floor(Math.random() * pool.length)] });
  }
  return drawn;
}

export default {
  name: "spawnpack",
  aliases: ["packspawn", "buypack", "cardpack", "spack"],
  category: "cards",
  description: "Buy a spawn pack — 15 cards (2T6 + 2T5 + 3T4 + 4T3 + 4T2) for 2M coins",
  usage: ".spawnpack",
  cooldown: 60,

  async run({ sock, msg, sender }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      // ── Cooldown check ─────────────────────────────────────────────────────
      const now = Date.now();
      const lastPack = packCooldowns.get(sender);
      if (lastPack && now - lastPack < PACK_COOLDOWN_MS) {
        const remaining = Math.ceil((PACK_COOLDOWN_MS - (now - lastPack)) / 1000);
        return reply(
`╭━━━〔 ⏳ 𝑪𝑶𝑶𝑳𝑫𝑶𝑾𝑵 〕━━━╮
┃ ✦ Pack purchase on cooldown!
┃
┃ ⏱ Wait › 『 ${remaining}s 』
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      // ── Registration check ─────────────────────────────────────────────────
      if (!await requireRegistration(sock, msg, sender)) return;

      // ── Balance check ──────────────────────────────────────────────────────
      const ecoUser = await getUser(sender);
      if ((ecoUser.money || 0) < PACK_COST) {
        return reply(
`╭━━━〔 💸 𝑰𝑵𝑺𝑼𝑭𝑭𝑰𝑪𝑰𝑬𝑵𝑻 𝑭𝑼𝑵𝑫𝑺 〕━━━╮
┃ ✦ Not enough coins for a Spawn Pack!
┃
┃ 💎 Pack Cost  ➜ 『 $${PACK_COST.toLocaleString()} 』
┃ 👛 Your Coins ➜ 『 $${(ecoUser.money || 0).toLocaleString()} 』
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 📦 Pack Contents (${TOTAL_CARDS} cards):
┃  🔴 2 × Tier 6 Mythical
┃  🟡 2 × Tier 5 Legendary
┃  🟣 3 × Tier 4 Epic
┃  🔵 4 × Tier 3 Rare
┃  🟢 4 × Tier 2 Uncommon
┣━━━━━━━━━━━━━━━━━━━━
┃ 💡 Earn via .daily .work .crime
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      // ── Set cooldown and deduct coins ──────────────────────────────────────
      packCooldowns.set(sender, now);
      ecoUser.money -= PACK_COST;
      await saveUser(sender, ecoUser);
      await addHistory(sender, "spawnpack", -PACK_COST, "Purchased Spawn Pack (15 cards)");

      // ── Draw cards ─────────────────────────────────────────────────────────
      const allCards   = [];
      const tierResults = [];
      let   hasApiError = false;

      for (const { tierName, count } of PACK_CONTENTS) {
        const drawn = await drawCardsForTier(tierName, count);
        if (drawn.length === 0) {
          hasApiError = true;
        }
        allCards.push(...drawn);
        tierResults.push({ tierName, count, drawn });
      }

      if (allCards.length === 0) {
        // Full refund — no cards at all
        ecoUser.money += PACK_COST;
        await saveUser(sender, ecoUser);
        await addHistory(sender, "spawnpack_refund", PACK_COST, "Refund — spawn pack unavailable");
        return reply(
`╭━━━〔 ❌ 𝑷𝑨𝑪𝑲 𝑼𝑵𝑨𝑽𝑨𝑰𝑳𝑨𝑩𝑳𝑬 〕━━━╮
┃ ✦ The card server is temporarily offline!
┃
┃ 🔧 This is not your fault.
┃ 💰 Coins fully refunded.
┃ ⏳ Please try again in a few minutes.
╰━━━━━━━━━━━━━━━━━━━━╯`
        );
      }

      // ── Hold the complete pack until the buyer explicitly claims it ─────────
      const cardUser = await findOrCreateUser(sender);
      cardUser.pendingCards = Array.isArray(cardUser.pendingCards)
        ? cardUser.pendingCards
        : [];

      const pendingCards = allCards.map((card) => ({
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
        summonedAt: new Date(),
      }));

      cardUser.pendingCards.push(...pendingCards);
      await cardUser.save();

      // ── Build summary listing ──────────────────────────────────────────────
      const tierLines = tierResults.map(({ tierName, drawn }) => {
        const emoji = TIER_EMOJI[tierName] || "⭐";
        const names = drawn.map(c => c.name || "Unknown").join(", ");
        return `┃ ${emoji} *${tierName}* (${drawn.length}): ${names}`;
      }).join("\n");

      const successMsg =
`╭━━〔 📦 𝑺𝑷𝑨𝑾𝑵 𝑷𝑨𝑪𝑲 𝑶𝑷𝑬𝑵𝑬𝑫! ✨ 〕━━╮
┃ ✦ You received *${allCards.length} cards*!
┃
${tierLines}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃ 💸 Cost   › $${PACK_COST.toLocaleString()}
┃ 👛 Wallet › $${ecoUser.money.toLocaleString()}
┣━━━━━━━━━━━━━━━━━━━━
┃ ✨ Cards are waiting to be claimed!
┃ Use *.claim* to add the full pack to your collection.
╰━━━━━━━━━━━━━━━━━━━━╯`;

      // Try to send the best card (Mythical/Tier6) as a media preview
      const bestCard = allCards.find(c => c.tierNum === "6" || c.tierNum === "S") || allCards[0];
      if (bestCard?.media) {
        try {
          await sendCardMedia(
            sock, jid, bestCard,
            successMsg,
            { quoted: msg, mentions: [sender] }
          );
          return;
        } catch { /* fall through to text */ }
      }

      return sock.sendMessage(jid, {
        text:     successMsg,
        mentions: [sender],
      }, { quoted: msg });

    } catch (err) {
      console.error("SPAWNPACK ERROR:", err);
      return reply(
`╭━━━〔 ❌ 𝑬𝑹𝑹𝑶𝑹 〕━━━╮
┃ ✦ Spawn Pack purchase failed!
┃
┃ Please try again later.
╰━━━━━━━━━━━━━━━━━━━━╯`
      );
    }
  },
};
