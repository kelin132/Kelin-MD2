import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { r as formatCoins } from "./game-qTZOZDmK.mjs";
import { d as SlidersHorizontal, f as ShoppingBag, h as Search, n as WalletCards } from "../_libs/lucide-react.mjs";
import { $ as useSession, M as purchaseItem, Q as useServerFn, b as fetchShopItems, et as useSessionWriter } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mart-DCwrdM1f.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMPTY_ITEMS = [];
function MartPage() {
	const { data: user } = useSession();
	const writeSession = useSessionWriter();
	const fetchItems = useServerFn(fetchShopItems);
	const purchase = useServerFn(purchaseItem);
	const query = useQuery({
		queryKey: ["aidoru", "items"],
		queryFn: fetchItems,
		retry: false
	});
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [search, setSearch] = (0, import_react.useState)("");
	const [sort, setSort] = (0, import_react.useState)("featured");
	const items = query.data ?? EMPTY_ITEMS;
	const categories = (0, import_react.useMemo)(() => ["all", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
	const filtered = (0, import_react.useMemo)(() => {
		const normalizedSearch = search.trim().toLowerCase();
		return items.filter((item) => filter === "all" || item.category === filter).filter((item) => {
			if (!normalizedSearch) return true;
			return [
				item.name,
				item.description,
				item.category
			].some((value) => value.toLowerCase().includes(normalizedSearch));
		}).sort((a, b) => {
			if (sort === "price-low") return a.price - b.price;
			if (sort === "price-high") return b.price - a.price;
			return (a.index ?? 0) - (b.index ?? 0);
		});
	}, [
		filter,
		items,
		search,
		sort
	]);
	const buyMutation = useMutation({
		mutationFn: (data) => purchase({ data }),
		onSuccess: (result) => {
			writeSession(result.user);
			toast.success(`Bought ${result.itemName} · -${formatCoins(result.spent)} coins`);
		},
		onError: (error) => toast.error(error.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Shop",
		subtitle: "Build your trainer loadout with live items from the bot catalogue.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6 pb-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "hof-panel overflow-hidden p-4 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-kicker",
									children: "Live trainer shop"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "hof-heading mt-1 text-3xl sm:text-4xl",
									children: "Shop the catalogue"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground",
									children: "The catalogue mirrors the Pokémon Mart in WhatsApp, so every purchase lands in the same trainer inventory."
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3 sm:min-w-56",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "grid size-11 place-items-center rounded-xl bg-cyan-300/12 text-cyan-200",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WalletCards, { className: "size-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-label",
									children: "Available wallet"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-value text-2xl",
									children: formatCoins(user?.coins ?? 0)
								})] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-col gap-3 sm:flex-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 focus-within:border-cyan-300/55",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 shrink-0 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: search,
									onChange: (event) => setSearch(event.target.value),
									placeholder: "Search items, effects, or categories",
									className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 sm:w-52",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "size-4 shrink-0 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: sort,
									onChange: (event) => setSort(event.target.value),
									className: "w-full bg-transparent text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground outline-none",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "featured",
											children: "Featured"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "price-low",
											children: "Price: low"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "price-high",
											children: "Price: high"
										})
									]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex gap-2 overflow-x-auto pb-1",
							children: categories.map((category) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"data-active": filter === category,
								onClick: () => setFilter(category),
								className: "hof-tab shrink-0 px-4 py-2 font-mono-ui text-[10px] font-bold tracking-[0.16em] uppercase",
								children: category === "all" ? "All items" : category
							}, category))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "hof-kicker",
						children: [filtered.length, " available"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "hof-heading mt-1 text-2xl",
						children: "Trainer supplies"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hidden text-right text-xs text-muted-foreground sm:block",
						children: "Select a quantity, then buy directly from your shared bot wallet."
					})]
				}),
				query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Loading the live Mart catalogue…"
				}),
				query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hof-panel p-5 text-sm text-muted-foreground",
					children: "The Mart catalogue is unavailable until the shared database is reachable."
				}),
				!query.isLoading && !query.isError && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hof-panel p-8 text-center text-sm text-muted-foreground",
					children: "No items match this search. Try another category or clear the search field."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: filtered.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MartCard, {
						item,
						pending: buyMutation.isPending,
						onBuy: (qty) => buyMutation.mutate({
							itemId: item.id,
							qty
						})
					}, item.id))
				})
			]
		})
	});
}
function MartCard({ item, pending, onBuy }) {
	const [qty, setQty] = (0, import_react.useState)(1);
	const image = item.imageUrl ?? item.sprite;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "hof-shop-card group",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hof-shop-card-image hof-image",
				"data-category": item.category,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: image,
					alt: item.name,
					loading: "lazy",
					className: "size-full object-contain transition group-hover:scale-110"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1 self-stretch py-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hof-kicker truncate",
							children: item.category
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono-ui text-[10px] text-muted-foreground",
							children: item.index ? `#${item.index}` : `P${item.page ?? "—"}`
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "mt-1 truncate font-display text-xl font-bold sm:text-2xl",
						children: [item.emoji ? `${item.emoji} ` : "", item.name]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground",
						children: item.description
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono-ui text-xs font-bold text-cyan-200",
							children: [formatCoins(item.price), " coins"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full border border-white/10 px-2 py-1 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground",
							children: item.rarity
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-col gap-2 sm:min-w-32",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center rounded-xl border border-white/10 bg-black/20 p-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `Decrease ${item.name} quantity`,
							onClick: () => setQty((value) => Math.max(1, value - 1)),
							className: "grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-white",
							children: "−"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							"aria-label": `Quantity for ${item.name}`,
							type: "number",
							min: 1,
							max: 99,
							value: qty,
							onChange: (event) => setQty(Math.max(1, Math.min(99, Number(event.target.value) || 1))),
							className: "w-10 bg-transparent text-center font-mono-ui text-xs outline-none"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": `Increase ${item.name} quantity`,
							onClick: () => setQty((value) => Math.min(99, value + 1)),
							className: "grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-white",
							children: "+"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onBuy(qty),
					disabled: pending,
					className: "hof-button inline-flex min-h-10 items-center justify-center gap-2 px-3 text-[10px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-3.5" }), pending ? "Buying…" : "Buy"]
				})]
			})
		]
	});
}
//#endregion
export { MartPage as component };
