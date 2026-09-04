import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Library, Search, Sparkles, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/aidoru/AppShell";
import { buyCardListing, fetchCardMarket, fetchMyCards } from "@/lib/aidoru.functions";
import { formatCoins, type CardMarketListing, type OwnedCard } from "@/lib/game";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Card Vault — AIDORU" },
      { name: "description", content: "View your live anime card collection and buy cards listed from the bot." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  return (
    <AppShell title="Card Vault" subtitle="Collect, discover, and trade cards across AIDORU and WhatsApp.">
      <CardsBody />
    </AppShell>
  );
}

function CardsBody() {
  const fetchCards = useServerFn(fetchMyCards);
  const fetchMarket = useServerFn(fetchCardMarket);
  const buyListing = useServerFn(buyCardListing);
  const queryClient = useQueryClient();
  const [view, setView] = useState<"mine" | "global" | "market">("mine");
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [displayLimit, setDisplayLimit] = useState(60);
  const cardsQuery = useQuery({
    queryKey: ["aidoru", "cards", view === "market" ? "mine" : view],
    queryFn: () => fetchCards({ data: { scope: view === "global" ? "global" : "mine" } }),
    enabled: view !== "market",
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
  const marketQuery = useQuery({
    queryKey: ["aidoru", "card-market"],
    queryFn: () => fetchMarket(),
    enabled: view === "market",
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
  const purchase = useMutation({
    mutationFn: (listingId: string) => buyListing({ data: { listingId } }),
    onSuccess: async () => {
      setPurchaseMessage("Card purchased. It is now in your shared bot collection.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["aidoru", "card-market"] }),
        queryClient.invalidateQueries({ queryKey: ["aidoru", "cards", "mine"] }),
        queryClient.invalidateQueries({ queryKey: ["aidoru", "session"] }),
      ]);
    },
  });

  const cards = cardsQuery.data ?? [];
  const market = marketQuery.data ?? [];
  const currentItems = view === "market" ? market : cards;
  const tiers = ["all", ...new Set(currentItems.map((card) => card.tier.toLowerCase()))];
  const visible = useMemo(
    () => currentItems.filter((card) => {
      const haystack = `${card.name} ${"series" in card ? card.series : card.sellerName} ${card.tier}`.toLowerCase();
      return haystack.includes(search.toLowerCase()) && (tier === "all" || card.tier.toLowerCase() === tier);
    }),
    [currentItems, search, tier],
  );
  const renderedItems = visible.slice(0, displayLimit);
  const isLoading = view === "market" ? marketQuery.isLoading : cardsQuery.isLoading;
  const isError = view === "market" ? marketQuery.isError : cardsQuery.isError;
  const mutationError = purchase.error instanceof Error ? purchase.error.message : "Purchase failed. The listing may already be sold or you may not have enough coins.";

  return (
    <div className="aidoru-page aidoru-page-cards space-y-6 pb-10">
      <section className="hof-panel relative overflow-hidden p-5 sm:p-7">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hof-kicker">Collection archive</p>
            <h2 className="hof-heading mt-1 text-4xl">{view === "mine" ? "Your Cards" : view === "global" ? "Global Card Index" : "Card Marketplace"}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {view === "market" ? "Live listings created with .vs in WhatsApp. Buy a card here and it moves into your shared bot collection." : "Browse the live mn_users.cards collection, or open the marketplace to trade with other trainers."}
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1">
            {(["mine", "global", "market"] as const).map((option) => (
              <button key={option} type="button" onClick={() => { setView(option); setTier("all"); setSearch(""); setDisplayLimit(60); setPurchaseMessage(""); }} className="hof-tab whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase" data-active={view === option}>
                {option === "mine" ? "My cards" : option === "global" ? "All cards" : "For sale"}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-right">
            <p className="hof-label">{view === "market" ? "Live listings" : "Cards owned"}</p>
            <p className="font-display text-3xl font-bold text-cyan-200">{view === "market" ? market.length : cards.length}</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
            <Search className="size-4 text-cyan-300" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setDisplayLimit(60); }} placeholder={view === "market" ? "Search card or seller" : "Search name or series"} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tiers.map((value) => (
              <button key={value} type="button" onClick={() => { setTier(value); setDisplayLimit(60); }} className="hof-tab whitespace-nowrap px-4 py-2 text-xs font-semibold" data-active={tier === value}>{value.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </section>

      {purchaseMessage && <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{purchaseMessage}</div>}
      {purchase.isError && <div className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{mutationError}</div>}
      {isLoading && <LoadingPanel />}
      {isError && <EmptyPanel title={view === "market" ? "Marketplace unavailable" : "Card vault unavailable"} body="The shared card collection could not be reached. Try refreshing once the database is online." />}
      {!isLoading && !isError && visible.length === 0 && <EmptyPanel title={view === "market" ? "No cards for sale" : cards.length ? "No cards match" : "No cards claimed yet"} body={view === "market" ? "Use .vs in WhatsApp to list one of your cards for other trainers." : cards.length ? "Try another search or tier filter." : "Claim cards in the bot and they will appear here automatically."} />}
      {!isLoading && !isError && visible.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {renderedItems.map((card, index) => view === "market" ? <MarketTile key={card.id} listing={card} index={index} onBuy={() => purchase.mutate(card.id)} busy={purchase.isPending && purchase.variables === card.id} /> : <CardTile key={`${card.cardId}-${index}`} card={card} index={index} global={view === "global"} />)}
        </div>
      )}
      {!isLoading && !isError && visible.length > renderedItems.length && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setDisplayLimit((limit) => limit + 60)} className="hof-tab px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]">
            Load more cards ({visible.length - renderedItems.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function CardTile({ card, index, global }: { card: OwnedCard; index: number; global: boolean }) {
  const image = card.media && /^https?:\/\//.test(card.media) ? card.media : null;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} whileHover={{ y: -4 }} className="aidoru-card-tile group overflow-hidden rounded-2xl border border-white/12 bg-[#07151f]/85 shadow-xl">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-cyan-300/20 via-slate-950 to-fuchsia-300/10">
        {image ? <img src={image} alt={card.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 4 ? "high" : "low"} width="480" height="640" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center p-4 text-center"><Sparkles className="size-8 text-cyan-200" /><span className="font-display text-lg font-semibold">{card.name}</span></div>}
        <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 font-mono-ui text-[9px] tracking-[0.14em] text-cyan-100">{card.tier || "COMMON"}</span>
      </div>
      <div className="p-3">
        <p className="truncate font-display text-lg font-bold">{card.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{card.series} · #{card.index ?? index + 1}</p>
        {global && <p className="mt-1 truncate font-mono-ui text-[9px] uppercase tracking-[0.12em] text-fuchsia-200">Trainer: {card.ownerName || "Unknown"}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2"><span className="hof-label">Card value</span><span className="font-mono-ui text-[10px] text-cyan-200">{formatCoins(card.price)}</span></div>
      </div>
    </motion.article>
  );
}

function MarketTile({ listing, index, onBuy, busy }: { listing: CardMarketListing; index: number; onBuy: () => void; busy: boolean }) {
  const image = listing.media && /^https?:\/\//.test(listing.media) ? listing.media : null;
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} whileHover={{ y: -4 }} className="aidoru-card-tile group overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-[#07151f]/90 shadow-xl">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-fuchsia-300/20 via-slate-950 to-cyan-300/10">
        {image ? <img src={image} alt={listing.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 4 ? "high" : "low"} width="480" height="640" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center p-4 text-center"><Sparkles className="size-8 text-fuchsia-200" /><span className="font-display text-lg font-semibold">{listing.name}</span></div>}
        <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 font-mono-ui text-[9px] tracking-[0.14em] text-fuchsia-100">{listing.tier || "COMMON"}</span>
      </div>
      <div className="p-3">
        <p className="truncate font-display text-lg font-bold">{listing.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">Sold by: <span className="font-semibold text-fuchsia-100">{listing.sellerName || "Unknown seller"}</span></p>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2"><span className="font-mono-ui text-[10px] text-cyan-200">{formatCoins(listing.price)} coins</span><button type="button" onClick={onBuy} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"><ShoppingBag className="size-3" />{busy ? "Buying…" : "Buy"}</button></div>
      </div>
    </motion.article>
  );
}

function LoadingPanel() {
  return <div className="hof-panel py-16 text-center text-sm text-muted-foreground"><Library className="mx-auto mb-3 size-8 animate-pulse text-cyan-300" />Loading your live card vault…</div>;
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <div className="hof-panel py-16 text-center"><Library className="mx-auto mb-3 size-8 text-cyan-300/70" /><p className="font-display text-2xl font-semibold">{title}</p><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p></div>;
}
