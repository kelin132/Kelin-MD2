import { createHash } from "node:crypto";

const TIERS = { common: "1", uncommon: "2", rare: "3", epic: "4", legendary: "5", mythical: "6", secret: "S" };

// A claim code is not the persistent cardId: never re-key owned collections.
// Derive it from the character and tier, not a tier-local array index or API ID.
export function getCardClaimId(card = {}) {
  const rawTier = String(card.tierNum || card.tier || "");
  const tier = TIERS[rawTier.toLowerCase()] || rawTier.toUpperCase();
  const name = String(card.name || card.title || card.cardId || card.claimId || "").normalize("NFKC").trim().toUpperCase();
  const digest = createHash("sha256").update(`${tier}:${name}`).digest("hex").slice(0, 13);
  return (BigInt(`0x${digest}`) % (36n ** 8n)).toString(36).toUpperCase().padStart(8, "0");
}

export function matchesCardClaimId(card, input) {
  const target = String(input || "").trim().toUpperCase();
  return !!target && [getCardClaimId(card), card?.claimId, card?.index, card?.cardId]
    .some(value => value != null && String(value).trim().toUpperCase() === target);
}
