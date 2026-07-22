/**
 * KELIN MD — Auction Manager
 * Holds active auctions in memory. One auction per group at a time.
 *
 * Auction shape:
 * {
 *   groupJid      : string   — the group where the auction is running
 *   sellerJid     : string   — full JID of the seller
 *   card          : object   — the full card object from seller's collection
 *   cardIndex     : number   — original index in seller's cards array (used to remove it)
 *   startBid      : number   — minimum opening bid
 *   currentBid    : number   — highest bid so far (0 = no bids yet)
 *   currentBidder : string|null — full JID of highest bidder, null if no bids
 *   endsAt        : number   — Date.now() + duration
 *   timer         : Timeout  — auto-close handle
 *   sock          : object   — Baileys socket reference for sending the result
 * }
 */

// Map<groupJid, Auction>
const auctions = new Map();

export function getAuction(groupJid) {
  return auctions.get(groupJid) || null;
}

export function hasAuction(groupJid) {
  return auctions.has(groupJid);
}

export function setAuction(groupJid, auction) {
  auctions.set(groupJid, auction);
}

export function deleteAuction(groupJid) {
  const a = auctions.get(groupJid);
  if (a?.timer) clearTimeout(a.timer);
  auctions.delete(groupJid);
}

export function placeBid(groupJid, bidderJid, amount) {
  const a = auctions.get(groupJid);
  if (!a) return { ok: false, reason: "no_auction" };
  if (bidderJid === a.sellerJid) return { ok: false, reason: "own_auction" };
  if (amount <= a.currentBid) return { ok: false, reason: "too_low", current: a.currentBid };
  if (amount < a.startBid)    return { ok: false, reason: "below_start", start: a.startBid };

  a.currentBid    = amount;
  a.currentBidder = bidderJid;
  return { ok: true };
}

export function timeLeft(groupJid) {
  const a = auctions.get(groupJid);
  if (!a) return 0;
  return Math.max(0, Math.ceil((a.endsAt - Date.now()) / 1000));
}
