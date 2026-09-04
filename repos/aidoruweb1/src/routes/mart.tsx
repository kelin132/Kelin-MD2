import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, ShoppingBag, SlidersHorizontal, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/aidoru/AppShell";
import { useSession, useSessionWriter } from "@/components/aidoru/session";
import { fetchShopItems, purchaseItem } from "@/lib/aidoru.functions";
import { formatCoins, type ShopItem } from "@/lib/game";

const EMPTY_ITEMS: ShopItem[] = [];

export const Route = createFileRoute("/mart")({
  head: () => ({
    meta: [
      { title: "Shop — AIDORU" },
      { name: "description", content: "Buy live Pokémon trainer items with your AIDORU wallet." },
    ],
  }),
  component: MartPage,
});

function MartPage() {
  const { data: user } = useSession();
  const writeSession = useSessionWriter();
  const fetchItems = useServerFn(fetchShopItems);
  const purchase = useServerFn(purchaseItem);
  const query = useQuery({ queryKey: ["aidoru", "items"], queryFn: fetchItems, retry: false });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"featured" | "price-low" | "price-high">("featured");
  const items = query.data ?? EMPTY_ITEMS;
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items
      .filter((item) => filter === "all" || item.category === filter)
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.name, item.description, item.category].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      })
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        return (a.index ?? 0) - (b.index ?? 0);
      });
  }, [filter, items, search, sort]);
  const buyMutation = useMutation({
    mutationFn: (data: { itemId: string; qty: number }) => purchase({ data }),
    onSuccess: (result) => {
      writeSession(result.user);
      toast.success(`Bought ${result.itemName} · -${formatCoins(result.spent)} coins`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="Shop"
      subtitle="Build your trainer loadout with live items from the bot catalogue."
    >
      <div className="space-y-6 pb-8">
        <section className="hof-panel overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="hof-kicker">Live trainer shop</p>
              <h2 className="hof-heading mt-1 text-3xl sm:text-4xl">Shop the catalogue</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                The catalogue mirrors the Pokémon Mart in WhatsApp, so every purchase lands in the
                same trainer inventory.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3 sm:min-w-56">
              <span className="grid size-11 place-items-center rounded-xl bg-cyan-300/12 text-cyan-200">
                <WalletCards className="size-5" />
              </span>
              <div>
                <p className="hof-label">Available wallet</p>
                <p className="hof-value text-2xl">{formatCoins(user?.coins ?? 0)}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 focus-within:border-cyan-300/55">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search items, effects, or categories"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 sm:w-52">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="w-full bg-transparent text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: low</option>
                <option value="price-high">Price: high</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                data-active={filter === category}
                onClick={() => setFilter(category)}
                className="hof-tab shrink-0 px-4 py-2 font-mono-ui text-[10px] font-bold tracking-[0.16em] uppercase"
              >
                {category === "all" ? "All items" : category}
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="hof-kicker">{filtered.length} available</p>
            <h2 className="hof-heading mt-1 text-2xl">Trainer supplies</h2>
          </div>
          <p className="hidden text-right text-xs text-muted-foreground sm:block">
            Select a quantity, then buy directly from your shared bot wallet.
          </p>
        </div>

        {query.isLoading && <p className="text-sm text-muted-foreground">Loading the live Mart catalogue…</p>}
        {query.isError && (
          <p className="hof-panel p-5 text-sm text-muted-foreground">
            The Mart catalogue is unavailable until the shared database is reachable.
          </p>
        )}
        {!query.isLoading && !query.isError && filtered.length === 0 && (
          <div className="hof-panel p-8 text-center text-sm text-muted-foreground">
            No items match this search. Try another category or clear the search field.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <MartCard
              key={item.id}
              item={item}
              pending={buyMutation.isPending}
              onBuy={(qty) => buyMutation.mutate({ itemId: item.id, qty })}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function MartCard({
  item,
  pending,
  onBuy,
}: {
  item: ShopItem;
  pending: boolean;
  onBuy: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const image = item.imageUrl ?? item.sprite;

  return (
    <article className="hof-shop-card group">
      <div className="hof-shop-card-image hof-image" data-category={item.category}>
        <img
          src={image}
          alt={item.name}
          loading="lazy"
          className="size-full object-contain transition group-hover:scale-110"
        />
      </div>
      <div className="min-w-0 flex-1 self-stretch py-1">
        <div className="flex items-center justify-between gap-2">
          <span className="hof-kicker truncate">{item.category}</span>
          <span className="font-mono-ui text-[10px] text-muted-foreground">
            {item.index ? `#${item.index}` : `P${item.page ?? "—"}`}
          </span>
        </div>
        <h3 className="mt-1 truncate font-display text-xl font-bold sm:text-2xl">
          {item.emoji ? `${item.emoji} ` : ""}{item.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono-ui text-xs font-bold text-cyan-200">{formatCoins(item.price)} coins</span>
          <span className="rounded-full border border-white/10 px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {item.rarity}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:min-w-32">
        <div className="flex items-center rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            aria-label={`Decrease ${item.name} quantity`}
            onClick={() => setQty((value) => Math.max(1, value - 1))}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-white"
          >
            −
          </button>
          <input
            aria-label={`Quantity for ${item.name}`}
            type="number"
            min={1}
            max={99}
            value={qty}
            onChange={(event) => setQty(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
            className="w-10 bg-transparent text-center font-mono-ui text-xs outline-none"
          />
          <button
            type="button"
            aria-label={`Increase ${item.name} quantity`}
            onClick={() => setQty((value) => Math.min(99, value + 1))}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-white"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => onBuy(qty)}
          disabled={pending}
          className="hof-button inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[10px]"
        >
          <ShoppingBag className="size-3.5" />
          {pending ? "Buying…" : "Buy"}
        </button>
      </div>
    </article>
  );
}
