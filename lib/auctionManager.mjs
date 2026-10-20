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
const bidderQueues = new Map();
const auctionQueues = new Map();

function bidderKey(jid) {
  return String(jid || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+(?=@)/, "");
}

/**
 * Serialize a bidder's balance-sensitive actions (bids and outgoing transfers)
 * so a transfer that started alongside a bid cannot slip through afterward.
 */
export function withBidderLock(bidderJid, operation) {
  const key = bidderKey(bidderJid);
  const previous = bidderQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  const settled = current.then(() => undefined, () => undefined);
  bidderQueues.set(key, settled);
  return current.finally(() => {
    if (bidderQueues.get(key) === settled) bidderQueues.delete(key);
  });
}

export function withAuctionLock(groupJid, operation) {
  const key = String(groupJid || "");
  const previous = auctionQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  const settled = current.then(() => undefined, () => undefined);
  auctionQueues.set(key, settled);
  return current.finally(() => {
    if (auctionQueues.get(key) === settled) auctionQueues.delete(key);
  });
}

export function hasActiveBidder(bidderJid) {
  const key = bidderKey(bidderJid);
  if (!key) return false;
  for (const auction of auctions.values()) {
    if (bidderKey(auction.currentBidder) === key) return true;
  }
  return false;
}

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
  if (bidderKey(bidderJid) === bidderKey(a.sellerJid)) return { ok: false, reason: "own_auction" };
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
