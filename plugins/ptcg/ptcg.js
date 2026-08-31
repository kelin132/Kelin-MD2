import { addHistory, requireRegistration } from "../economy/database.js";
import {
  addCards,
  createListing,
  createTradeOffer,
  creditEconomy,
  debitEconomy,
  deleteTrade,
  getIncomingTrade,
  getListingById,
  getMarketListings,
  getOrCreatePlayer,
  getOutgoingTrade,
  getPlayer,
  incrementPacksOpened,
  removeListing,
  removeOwnedCard,
  restoreCard,
} from "../../lib/ptcg/database.mjs";
import {
  PACK_PRICE,
  PACK_COOLDOWN_MS,
  RARITY_INFO,
  allCards,
  cardKey,
  cardValue,
  drawPack,
  findCardByKey,
  formatCard,
  listSetPacks,
  pickSpawnCard,
  rarityEmoji,
  rarityLabel,
  rarityOrder,
  searchCards,
  setByCode,
  setName,
  toPublicCard,
} from "../../lib/ptcg/cards.mjs";

const spawns = new Map();
const spawnCooldowns = new Map();
const SPAWN_TTL = 10 * 60 * 1000;
const SPAWN_COOLDOWN = 20 * 60 * 1000;
const packCooldowns = new Map();
const MARKET_PAGE_SIZE = 10;
const COLLECTION_PAGE_SIZE = 15;

const tag = (jid) => `@${String(jid || "").split("@")[0]}`;
const money = (amount) => Number(amount || 0).toLocaleString();

function reply(sock, msg, text, extra = {}) {
  return sock.sendMessage(msg.key.remoteJid, { text, ...extra }, { quoted: msg });
}

function targetFromMessage(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || {};
  return ctx.mentionedJid?.[0] || ctx.participant || null;
}

function ownedCard(card) {
  return {
    key: card.key || cardKey(card),
    set: card.set,
    number: card.number,
    name: card.name,
    rarity: card.rarity,
    rarityLabel: card.rarityLabel || rarityLabel(card.rarity),
    imageUrl: card.imageUrl,
    value: card.value || cardValue(card),
  };
}

function resolveOwned(player, ref) {
  const value = String(ref || "").trim();
  if (!value) return null;
  const index = Number(value);
  if (Number.isInteger(index) && index >= 1 && index <= player.cards.length) {
    return { card: player.cards[index - 1], index: index - 1 };
  }
  const lower = value.toLowerCase();
  const indexById = player.cards.findIndex((card) =>
    String(card.ownedId || "").toLowerCase() === lower
    || String(card.key || "").toLowerCase() === lower
    || String(card.name || "").toLowerCase() === lower,
  );
  return indexById < 0 ? null : { card: player.cards[indexById], index: indexById };
}

function imageCaption(card, title, extra = "") {
  return [
    `🃏 *${title}*`,
    ``,
    `${rarityEmoji(card.rarity)} *${card.name}*`,
    `📦 Set: ${card.set} — ${setName(card.set)}`,
    `🔢 Number: ${card.number}`,
    `⭐ Rarity: ${rarityLabel(card.rarity)}`,
    `💰 Base value: ${money(card.value || cardValue(card))} coins`,
    extra,
  ].filter(Boolean).join("\n");
}

async function sendCard(sock, msg, card, caption, mentions = []) {
  const jid = msg.key.remoteJid;
  try {
    return await sock.sendMessage(
      jid,
      { image: { url: card.imageUrl }, caption, mentions },
      { quoted: msg },
    );
  } catch (error) {
    console.error("PTCG IMAGE ERROR:", error.message);
    return reply(sock, msg, caption, { mentions });
  }
}

function helpText() {
  return `🎴 *POKÉMON TCG POCKET*

Collect real Pokémon TCG Pocket cards using the anime-style spawn system.

📦 *Packs*
• *.ptcg packs* — show available sets
• *.ptcg open A1* — open a 5-card pack (${money(PACK_PRICE)} coins, 1-minute cooldown)

🔎 *Collection*
• *.ptcg collection [page]* — view your cards
• *.ptcg stats* — completion progress
• *.ptcg view A1-1* — view a card
• *.ptcg search pikachu* — search the database
• *.ptcg sets* — list set codes
• *.ptcg rarities* — rarity values and labels

🎁 *Group spawns*
• *.ptcg spawn [set]* — spawn one random card (20-minute group cooldown)
• *.ptcg claim* — claim the current spawn

💱 *Trading*
• *.ptcg trade @user <your-card> <their-card>*
• *.ptcg accept* / *.ptcg deny*
• *.ptcg tradeinfo* — see your pending trade

🏪 *Marketplace*
• *.ptcg sell <your-card> <price>*
• *.ptcg market* — browse listings
• *.ptcg buy <listing-number>*
• *.ptcg cancel <listing-number>*`;
}

function setListText() {
  const sets = listSetPacks();
  return [
    `📦 *POKÉMON TCG POCKET SETS*`,
    ``,
    ...sets.map((set) =>
      `• *${set.code}* — ${set.name} (${set.count} cards)`
      + (set.packs.length ? `\n  Packs: ${set.packs.join(", ")}` : ""),
    ),
    ``,
    `Open with *.ptcg open <set-code>*`,
    `Example: *.ptcg open A1*`,
  ].join("\n");
}

function rarityListText() {
  return [
    `⭐ *POKÉMON TCG POCKET RARITIES*`,
    ``,
    ...rarityOrder
      .filter((code) => RARITY_INFO[code])
      .map((code) =>
        `${rarityEmoji(code)} *${rarityLabel(code)}* (${code}) — base value ${money(cardValue({ rarity: code }))} coins`
        + (RARITY_INFO[code].tradeable === false ? " · not tradeable" : ""),
      ),
    ``,
    `Pack odds are read from the dataset's pull-rate tables.`,
  ].join("\n");
}

async function openPack({ sock, msg, sender, setCode }) {
  const set = setByCode(setCode || "A1");
  if (!set) return reply(sock, msg, `❌ Unknown set "*${setCode}*".\n\nUse *.ptcg packs* to see valid set codes.`);
  if (!await requireRegistration(sock, msg, sender)) return;

  const lastPack = packCooldowns.get(sender) || 0;
  if (Date.now() - lastPack < PACK_COOLDOWN_MS) {
    const left = Math.ceil((PACK_COOLDOWN_MS - (Date.now() - lastPack)) / 1000);
    return reply(sock, msg, `⏳ Your Pokémon pack is on cooldown. Try again in *${left}s*.`);
  }

  const charged = await debitEconomy(sender, PACK_PRICE);
  if (!charged) {
    return reply(
      sock,
      msg,
      `💰 You need *${money(PACK_PRICE)} coins* to open a pack.\n\nUse *.balance* to check your wallet.`,
    );
  }

  packCooldowns.set(sender, Date.now());
  try {
    const pulled = drawPack(set.code);
    if (!pulled.length) throw new Error("No cards were drawn");
    await getOrCreatePlayer(sender, msg.pushName || "Trainer");
    await addCards(sender, pulled);
    await incrementPacksOpened(sender);
    await addHistory(sender, "ptcg-pack", -PACK_PRICE, `Opened Pokémon TCG Pocket ${set.code} pack`);

    const lines = pulled.map((card, index) =>
      `${index + 1}. ${formatCard(card)} — ${money(card.value)} coins`,
    );
    const caption = [
      `🎁 *PACK OPENED — ${set.code}*`,
      `📦 ${setName(set.code)}`,
      ``,
      ...lines,
      ``,
      `💰 Paid: ${money(PACK_PRICE)} coins`,
      `🎒 Added to ${tag(sender)}'s collection`,
      `Use *.ptcg collection* to view your cards.`,
    ].join("\n");
    const first = pulled[0];
    return sendCard(sock, msg, first, caption, [sender]);
  } catch (error) {
    packCooldowns.delete(sender);
    await creditEconomy(sender, PACK_PRICE);
    console.error("PTCG OPEN ERROR:", error);
    return reply(sock, msg, "❌ The pack could not be opened, so your coins were refunded.");
  }
}

async function spawnCard({ sock, msg, sender, setCode }) {
  const gid = msg.key.remoteJid;
  const set = setCode ? setByCode(setCode) : null;
  if (setCode && !set) return reply(sock, msg, `❌ Unknown set "*${setCode}*". Use *.ptcg packs*.`);

  const last = spawnCooldowns.get(gid) || 0;
  if (Date.now() - last < SPAWN_COOLDOWN) {
    const left = Math.ceil((SPAWN_COOLDOWN - (Date.now() - last)) / 1000);
    return reply(sock, msg, `⏳ A card was spawned recently. Try again in *${left}s*.`);
  }
  if (spawns.has(gid)) return reply(sock, msg, "🎴 A Pokémon card is already waiting to be claimed in this chat.");

  const card = pickSpawnCard(set?.code);
  if (!card) return reply(sock, msg, "❌ Could not draw a card from that set.");
  spawns.set(gid, { card, expiresAt: Date.now() + SPAWN_TTL });
  spawnCooldowns.set(gid, Date.now());

  return sendCard(
    sock,
    msg,
    card,
    `🎴 *POKÉMON CARD SPAWNED!*\n\n${formatCard(card)}\n📦 Set: ${setName(card.set)}\n\n💬 Type *.ptcg claim* to collect it.\n⚡ First person to claim it wins!\n⏳ Expires in 10 minutes.\n\n⏱️ The next group spawn can happen in 20 minutes.`,
  );
}

async function claimSpawn({ sock, msg, sender }) {
  const gid = msg.key.remoteJid;
  const spawn = spawns.get(gid);
  if (!spawn) return reply(sock, msg, "❌ There is no Pokémon card waiting in this chat.\n\nUse *.ptcg spawn* to create one.");
  if (spawn.expiresAt <= Date.now()) {
    spawns.delete(gid);
    return reply(sock, msg, "⏰ That card spawn expired.");
  }

  spawns.delete(gid);
  await getOrCreatePlayer(sender, msg.pushName || "Trainer");
  const [saved] = await addCards(sender, [spawn.card]);
  return sendCard(
    sock,
    msg,
    saved,
    imageCaption(saved, "CARD CLAIMED", `✅ Added to ${tag(sender)}'s collection.`),
    [sender],
  );
}

async function showCollection({ sock, msg, sender, pageArg }) {
  const player = await getOrCreatePlayer(sender, msg.pushName || "Trainer");
  const total = player.cards.length;
  if (!total) return reply(sock, msg, "🎒 Your Pokémon TCG collection is empty.\n\nUse *.ptcg open A1* to open a pack.");
  const totalPages = Math.ceil(total / COLLECTION_PAGE_SIZE);
  const page = Math.min(Math.max(Number(pageArg) || 1, 1), totalPages);
  const start = (page - 1) * COLLECTION_PAGE_SIZE;
  const slice = player.cards.slice(start, start + COLLECTION_PAGE_SIZE);
  const lines = slice.map((card, index) =>
    `*${start + index + 1}.* ${formatCard(card)}`,
  );
  return reply(sock, msg, [
    `🎒 *${tag(sender)}'S POKÉMON COLLECTION*`,
    `📦 ${total} card${total === 1 ? "" : "s"} · Page ${page}/${totalPages}`,
    ``,
    ...lines,
    ``,
    `Use *.ptcg view <number or set-number>* to inspect a card.`,
    totalPages > 1 ? `Use *.ptcg collection ${page + 1 <= totalPages ? page + 1 : 1}* for another page.` : "",
  ].filter(Boolean).join("\n"), { mentions: [sender] });
}

async function showStats({ sock, msg, sender }) {
  const player = await getOrCreatePlayer(sender, msg.pushName || "Trainer");
  const unique = new Set(player.cards.map((card) => card.key || cardKey(card))).size;
  const total = allCards().length;
  const percent = total ? ((unique / total) * 100).toFixed(2) : "0.00";
  const duplicates = player.cards.length - unique;
  return reply(sock, msg, [
    `📊 *${tag(sender)}'S POKÉMON TCG STATS*`,
    ``,
    `🎒 Cards owned: *${player.cards.length}*`,
    `✨ Unique cards: *${unique}/${total}* (${percent}%)`,
    `♻️ Duplicate cards: *${duplicates}*`,
    `🎁 Packs opened: *${player.packsOpened || 0}*`,
    ``,
    `Complete your collection by opening packs, claiming spawns, trading, and buying cards.`,
  ].join("\n"), { mentions: [sender] });
}

async function viewCard({ sock, msg, sender, ref }) {
  const value = String(ref || "").trim();
  if (!value) return reply(sock, msg, "Usage: *.ptcg view <collection-number or set-number>*\nExample: *.ptcg view A1-1*");
  const player = await getPlayer(sender);
  const owned = player && resolveOwned(player, value);
  const card = owned?.card || (findCardByKey(value) ? toPublicCard(findCardByKey(value)) : null);
  if (!card) {
    const found = searchCards(value, 1)[0];
    if (!found) return reply(sock, msg, `❌ Card "*${value}*" was not found.`);
    return sendCard(sock, msg, toPublicCard(found), imageCaption(toPublicCard(found), "CARD DETAILS"));
  }
  return sendCard(sock, msg, card, imageCaption(card, "CARD DETAILS"), [sender]);
}

async function searchDatabase({ sock, msg, query }) {
  const found = searchCards(query, 20);
  if (!found.length) return reply(sock, msg, `❌ No Pokémon cards matched "*${query}*".`);
  return reply(sock, msg, [
    `🔎 *POKÉMON CARD SEARCH*`,
    `Query: *${query}*`,
    ``,
    ...found.map((card) => `${formatCard(card)} — ${setName(card.set)}`),
    ``,
    `Use *.ptcg view <set-number>* to view a card.`,
  ].join("\n"));
}

async function showMarket({ sock, msg, args }) {
  const listings = await getMarketListings();
  if (!listings.length) return reply(sock, msg, "🏪 The Pokémon card marketplace is empty.\n\nList one with *.ptcg sell <card-number> <price>*.");
  const pages = Math.ceil(listings.length / MARKET_PAGE_SIZE);
  const page = Math.min(Math.max(Number(args[0]) || 1, 1), pages);
  const start = (page - 1) * MARKET_PAGE_SIZE;
  const slice = listings.slice(start, start + MARKET_PAGE_SIZE);
  return reply(sock, msg, [
    `🏪 *POKÉMON CARD MARKET*`,
    `Page ${page}/${pages}`,
    ``,
    ...slice.map((listing, index) => {
      const card = listing.card;
      return `*${start + index + 1}.* ${formatCard(card)}\n   💰 ${money(listing.price)} coins · Seller ${tag(listing.sellerJid)}`;
    }),
    ``,
    `Buy with *.ptcg buy <listing-number>*`,
  ].join("\n"), {
    mentions: slice.map((listing) => listing.sellerJid),
  });
}

async function sellCard({ sock, msg, sender, args }) {
  if (!await requireRegistration(sock, msg, sender)) return;
  const price = Number(args[args.length - 1]);
  const ref = args.slice(0, -1).join(" ");
  if (!ref || !Number.isInteger(price) || price <= 0 || price > 500_000_000) {
    return reply(sock, msg, "Usage: *.ptcg sell <collection-number or set-number> <price>*\nExample: *.ptcg sell 1 5000");
  }
  const player = await getOrCreatePlayer(sender, msg.pushName || "Trainer");
  const resolved = resolveOwned(player, ref);
  if (!resolved) return reply(sock, msg, `❌ Card "*${ref}*" is not in your collection.`);

  const removed = await removeOwnedCard(sender, resolved.card.ownedId);
  if (!removed) return reply(sock, msg, "❌ That card is no longer available. Refresh your collection and try again.");
  try {
    const listing = await createListing({
      sellerJid: sender,
      card: ownedCard(removed),
      price,
    });
    return reply(sock, msg, `✅ Listed ${formatCard(removed)} for *${money(price)} coins*.\n\nUse *.ptcg market* to view listings.\nListing number appears in the market list.`);
  } catch (error) {
    await restoreCard(sender, removed);
    console.error("PTCG SELL ERROR:", error);
    return reply(sock, msg, "❌ Could not create the listing. Your card was returned.");
  }
}

async function buyCard({ sock, msg, sender, listingArg }) {
  if (!await requireRegistration(sock, msg, sender)) return;
  const listings = await getMarketListings();
  const number = Number(listingArg);
  const listing = Number.isInteger(number) && number >= 1
    ? listings[number - 1]
    : await getListingById(listingArg);
  if (!listing) return reply(sock, msg, "❌ That marketplace listing no longer exists.\n\nUse *.ptcg market* to refresh the list.");
  if (listing.sellerJid === sender) return reply(sock, msg, "❌ You cannot buy your own listing.");

  const charged = await debitEconomy(sender, listing.price);
  if (!charged) return reply(sock, msg, `💰 You need *${money(listing.price)} coins* to buy this card.`);
  const removed = await removeListing(listing._id);
  if (!removed) {
    await creditEconomy(sender, listing.price);
    return reply(sock, msg, "❌ Someone bought that listing first. Your coins were refunded.");
  }

  try {
    await getOrCreatePlayer(sender, msg.pushName || "Trainer");
    await addCards(sender, [listing.card]);
    await creditEconomy(listing.sellerJid, listing.price);
    await addHistory(sender, "ptcg-buy", -listing.price, `Bought ${listing.card.name} (${listing.card.key})`);
    await addHistory(listing.sellerJid, "ptcg-sale", listing.price, `Sold ${listing.card.name} (${listing.card.key})`);
    return sendCard(
      sock,
      msg,
      listing.card,
      imageCaption(listing.card, "CARD PURCHASED", `✅ Bought from ${tag(listing.sellerJid)} for ${money(listing.price)} coins.`),
      [sender, listing.sellerJid],
    );
  } catch (error) {
    await creditEconomy(sender, listing.price);
    await restoreCard(listing.sellerJid, listing.card);
    console.error("PTCG BUY ERROR:", error);
    return reply(sock, msg, "❌ Purchase failed. Your coins were refunded.");
  }
}

async function cancelListing({ sock, msg, sender, listingArg }) {
  const own = (await getMarketListings()).filter((listing) => listing.sellerJid === sender);
  const number = Number(listingArg);
  const listing = Number.isInteger(number) && number >= 1 ? own[number - 1] : await getListingById(listingArg);
  if (!listing || listing.sellerJid !== sender) return reply(sock, msg, "❌ You do not have that active listing.");
  const removed = await removeListing(listing._id, sender);
  if (!removed) return reply(sock, msg, "❌ That listing is no longer active.");
  await restoreCard(sender, listing.card);
  return reply(sock, msg, `✅ Removed ${formatCard(listing.card)} from the market and returned it to your collection.`);
}

async function proposeTrade({ sock, msg, sender, args }) {
  const target = targetFromMessage(msg);
  const refs = args.filter((arg) => !arg.startsWith("@"));
  if (!target || refs.length < 2) {
    return reply(sock, msg, "Usage: *.ptcg trade @user <your-card> <their-card>*\nCard references can be collection numbers or set numbers such as A1-1.");
  }
  if (target === sender) return reply(sock, msg, "❌ You cannot trade with yourself.");
  if (await getOutgoingTrade(sender)) return reply(sock, msg, "❌ You already have a pending outgoing trade.");
  if (await getIncomingTrade(sender)) return reply(sock, msg, "❌ Accept or deny your current incoming trade first.");

  const [fromPlayer, toPlayer] = await Promise.all([getPlayer(sender), getPlayer(target)]);
  const from = fromPlayer && resolveOwned(fromPlayer, refs[refs.length - 2]);
  const to = toPlayer && resolveOwned(toPlayer, refs[refs.length - 1]);
  if (!from) return reply(sock, msg, `❌ Your card "*${refs[refs.length - 2]}*" is not in your collection.`);
  if (!to) return reply(sock, msg, `❌ ${tag(target)} does not own card "*${refs[refs.length - 1]}*".`, { mentions: [target] });

  await createTradeOffer({
    fromJid: sender,
    toJid: target,
    fromCard: ownedCard(from.card),
    toCard: ownedCard(to.card),
    fromOwnedId: from.card.ownedId,
    toOwnedId: to.card.ownedId,
  });
  return reply(sock, msg, [
    `🔄 *TRADE OFFER SENT*`,
    ``,
    `${tag(sender)} offers ${formatCard(from.card)}`,
    `for ${formatCard(to.card)} from ${tag(target)}.`,
    ``,
    `${tag(target)} can use *.ptcg accept* or *.ptcg deny*.`,
    `⏳ Offer expires in 5 minutes.`,
  ].join("\n"), { mentions: [sender, target] });
}

async function acceptIncomingTrade({ sock, msg, sender }) {
  const offer = await getIncomingTrade(sender);
  if (!offer) return reply(sock, msg, "❌ You have no pending Pokémon card trade.");
  const [fromPlayer, toPlayer] = await Promise.all([getPlayer(offer.fromJid), getPlayer(sender)]);
  const offered = fromPlayer && resolveOwned(fromPlayer, offer.fromOwnedId);
  const requested = toPlayer && resolveOwned(toPlayer, offer.toOwnedId);
  if (!offered || !requested) {
    await deleteTrade(offer._id);
    return reply(sock, msg, "❌ This trade is no longer valid because one of the cards is unavailable.");
  }

  const removedOffered = await removeOwnedCard(offer.fromJid, offer.fromOwnedId);
  const removedRequested = await removeOwnedCard(sender, offer.toOwnedId);
  if (!removedOffered || !removedRequested) {
    if (removedOffered) await restoreCard(offer.fromJid, removedOffered);
    if (removedRequested) await restoreCard(sender, removedRequested);
    return reply(sock, msg, "❌ The trade could not be completed. Neither card was changed.");
  }
  await addCards(sender, [removedOffered]);
  await addCards(offer.fromJid, [removedRequested]);
  await deleteTrade(offer._id);
  return reply(sock, msg, [
    `✅ *TRADE COMPLETE*`,
    ``,
    `${tag(sender)} received ${formatCard(removedOffered)}.`,
    `${tag(offer.fromJid)} received ${formatCard(removedRequested)}.`,
  ].join("\n"), { mentions: [sender, offer.fromJid] });
}

async function showTradeInfo({ sock, msg, sender }) {
  const incoming = await getIncomingTrade(sender);
  const outgoing = await getOutgoingTrade(sender);
  if (!incoming && !outgoing) return reply(sock, msg, "You have no pending Pokémon card trades.");
  const offer = incoming || outgoing;
  const incomingText = Boolean(incoming);
  return reply(sock, msg, [
    `🔄 *PENDING POKÉMON TRADE*`,
    ``,
    `${incomingText ? `From ${tag(offer.fromJid)}` : `To ${tag(offer.toJid)}`}`,
    `Offer: ${formatCard(offer.fromCard)}`,
    `Wants: ${formatCard(offer.toCard)}`,
    ``,
    incomingText ? "Use *.ptcg accept* or *.ptcg deny*." : "Use *.ptcg deny* to remove your outgoing offer.",
  ].join("\n"), { mentions: [offer.fromJid, offer.toJid] });
}

export default {
  name: "ptcg",
  aliases: ["pokemoncards", "tcgp"],
  category: "ptcg",
  description: "Pokémon TCG Pocket packs, collection, trading and marketplace",
  usage: ".ptcg [open|collection|view|search|spawn|claim|trade|market|sell|buy]",
  cooldown: 3,

  async run({ sock, msg, sender, args }) {
    const sub = String(args[0] || "help").toLowerCase();
    const rest = args.slice(1);

    try {
      if (sub === "help" || sub === "menu") return reply(sock, msg, helpText());
      if (sub === "packs" || sub === "sets") return reply(sock, msg, setListText());
      if (sub === "rarities" || sub === "rarity") return reply(sock, msg, rarityListText());
      if (sub === "open" || sub === "pack") return openPack({ sock, msg, sender, setCode: rest[0] || "A1" });
      if (sub === "spawn") return spawnCard({ sock, msg, sender, setCode: rest[0] || "A1" });
      if (sub === "claim") return claimSpawn({ sock, msg, sender });
      if (["collection", "col", "cards"].includes(sub)) return showCollection({ sock, msg, sender, pageArg: rest[0] });
      if (sub === "stats" || sub === "progress") return showStats({ sock, msg, sender });
      if (["view", "card"].includes(sub)) return viewCard({ sock, msg, sender, ref: rest.join(" ") });
      if (sub === "search") return searchDatabase({ sock, msg, query: rest.join(" ") });
      if (sub === "sell") return sellCard({ sock, msg, sender, args: rest });
      if (sub === "market" || sub === "listings") return showMarket({ sock, msg, args: rest });
      if (sub === "buy") return buyCard({ sock, msg, sender, listingArg: rest[0] });
      if (sub === "cancel") return cancelListing({ sock, msg, sender, listingArg: rest[0] });
      if (sub === "trade") return proposeTrade({ sock, msg, sender, args: rest });
      if (sub === "tradeinfo" || sub === "offers") return showTradeInfo({ sock, msg, sender });
      if (sub === "accept") return acceptIncomingTrade({ sock, msg, sender });
      if (sub === "deny" || sub === "decline" || sub === "reject") {
        const offer = await getIncomingTrade(sender) || await getOutgoingTrade(sender);
        if (!offer) return reply(sock, msg, "❌ You have no pending Pokémon card trade.");
        await deleteTrade(offer._id);
        return reply(sock, msg, `✅ Pokémon card trade with ${tag(offer.fromJid === sender ? offer.toJid : offer.fromJid)} declined.`, {
          mentions: [offer.fromJid, offer.toJid],
        });
      }
      return reply(sock, msg, helpText());
    } catch (error) {
      console.error("PTCG ERROR:", error);
      return reply(sock, msg, "❌ Pokémon TCG command failed. Please try again.");
    }
  },
};