import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { r as formatCoins } from "./game-qTZOZDmK.mjs";
import { f as ShoppingBag, h as Search, k as Library, u as Sparkles } from "../_libs/lucide-react.mjs";
import { Q as useServerFn, _ as fetchMyCards, r as buyCardListing, u as fetchCardMarket } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cards-osc0Wtdd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function CardsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Card Vault",
		subtitle: "Collect, discover, and trade cards across AIDORU and WhatsApp.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardsBody, {})
	});
}
function CardsBody() {
	const fetchCards = useServerFn(fetchMyCards);
	const fetchMarket = useServerFn(fetchCardMarket);
	const buyListing = useServerFn(buyCardListing);
	const queryClient = useQueryClient();
	const [view, setView] = (0, import_react.useState)("mine");
	const [search, setSearch] = (0, import_react.useState)("");
	const [tier, setTier] = (0, import_react.useState)("all");
	const [purchaseMessage, setPurchaseMessage] = (0, import_react.useState)("");
	const [displayLimit, setDisplayLimit] = (0, import_react.useState)(60);
	const cardsQuery = useQuery({
		queryKey: [
			"aidoru",
			"cards",
			view === "market" ? "mine" : view
		],
		queryFn: () => fetchCards({ data: { scope: view === "global" ? "global" : "mine" } }),
		enabled: view !== "market",
		staleTime: 3e4,
		gcTime: 3e5,
		retry: false
	});
	const marketQuery = useQuery({
		queryKey: ["aidoru", "card-market"],
		queryFn: () => fetchMarket(),
		enabled: view === "market",
		staleTime: 15e3,
		gcTime: 3e5,
		retry: false
	});
	const purchase = useMutation({
		mutationFn: (listingId) => buyListing({ data: { listingId } }),
		onSuccess: async () => {
			setPurchaseMessage("Card purchased. It is now in your shared bot collection.");
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["aidoru", "card-market"] }),
				queryClient.invalidateQueries({ queryKey: [
					"aidoru",
					"cards",
					"mine"
				] }),
				queryClient.invalidateQueries({ queryKey: ["aidoru", "session"] })
			]);
		}
	});
	const cards = cardsQuery.data ?? [];
	const market = marketQuery.data ?? [];
	const currentItems = view === "market" ? market : cards;
	const tiers = ["all", ...new Set(currentItems.map((card) => card.tier.toLowerCase()))];
	const visible = (0, import_react.useMemo)(() => currentItems.filter((card) => {
		return `${card.name} ${"series" in card ? card.series : card.sellerName} ${card.tier}`.toLowerCase().includes(search.toLowerCase()) && (tier === "all" || card.tier.toLowerCase() === tier);
	}), [
		currentItems,
		search,
		tier
	]);
	const renderedItems = visible.slice(0, displayLimit);
	const isLoading = view === "market" ? marketQuery.isLoading : cardsQuery.isLoading;
	const isError = view === "market" ? marketQuery.isError : cardsQuery.isError;
	const mutationError = purchase.error instanceof Error ? purchase.error.message : "Purchase failed. The listing may already be sold or you may not have enough coins.";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "aidoru-page aidoru-page-cards space-y-6 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel relative overflow-hidden p-5 sm:p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex flex-wrap items-end justify-between gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Collection archive"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-4xl",
								children: view === "mine" ? "Your Cards" : view === "global" ? "Global Card Index" : "Card Marketplace"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 max-w-xl text-sm text-muted-foreground",
								children: view === "market" ? "Live listings created with .vs in WhatsApp. Buy a card here and it moves into your shared bot collection." : "Browse the live mn_users.cards collection, or open the marketplace to trade with other trainers."
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1",
							children: [
								"mine",
								"global",
								"market"
							].map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setView(option);
									setTier("all");
									setSearch("");
									setDisplayLimit(60);
									setPurchaseMessage("");
								},
								className: "hof-tab whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase",
								"data-active": view === option,
								children: option === "mine" ? "My cards" : option === "global" ? "All cards" : "For sale"
							}, option))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-label",
								children: view === "market" ? "Live listings" : "Cards owned"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-3xl font-bold text-cyan-200",
								children: view === "market" ? market.length : cards.length
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mt-5 flex flex-col gap-3 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 text-cyan-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: search,
							onChange: (event) => {
								setSearch(event.target.value);
								setDisplayLimit(60);
							},
							placeholder: view === "market" ? "Search card or seller" : "Search name or series",
							className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2 overflow-x-auto pb-1",
						children: tiers.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setTier(value);
								setDisplayLimit(60);
							},
							className: "hof-tab whitespace-nowrap px-4 py-2 text-xs font-semibold",
							"data-active": tier === value,
							children: value.toUpperCase()
						}, value))
					})]
				})]
			}),
			purchaseMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100",
				children: purchaseMessage
			}),
			purchase.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100",
				children: mutationError
			}),
			isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingPanel, {}),
			isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyPanel, {
				title: view === "market" ? "Marketplace unavailable" : "Card vault unavailable",
				body: "The shared card collection could not be reached. Try refreshing once the database is online."
			}),
			!isLoading && !isError && visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyPanel, {
				title: view === "market" ? "No cards for sale" : cards.length ? "No cards match" : "No cards claimed yet",
				body: view === "market" ? "Use .vs in WhatsApp to list one of your cards for other trainers." : cards.length ? "Try another search or tier filter." : "Claim cards in the bot and they will appear here automatically."
			}),
			!isLoading && !isError && visible.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
				children: renderedItems.map((card, index) => {
					if (view === "market") {
						const listing = card;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketTile, {
							listing,
							index,
							onBuy: () => purchase.mutate(listing.id),
							busy: purchase.isPending && purchase.variables === listing.id
						}, listing.id);
					}
					const ownedCard = card;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTile, {
						card: ownedCard,
						index,
						global: view === "global"
					}, `${ownedCard.cardId}-${index}`);
				})
			}),
			!isLoading && !isError && visible.length > renderedItems.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setDisplayLimit((limit) => limit + 60),
					className: "hof-tab px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]",
					children: [
						"Load more cards (",
						visible.length - renderedItems.length,
						" remaining)"
					]
				})
			})
		]
	});
}
function CardTile({ card, index, global }) {
	const image = card.media && /^https?:\/\//.test(card.media) ? card.media : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		initial: {
			opacity: 0,
			y: 12
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { delay: Math.min(index * .025, .2) },
		whileHover: { y: -4 },
		className: "aidoru-card-tile group overflow-hidden rounded-2xl border border-white/12 bg-[#07151f]/85 shadow-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-cyan-300/20 via-slate-950 to-fuchsia-300/10",
			children: [image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: image,
				alt: card.name,
				loading: index < 4 ? "eager" : "lazy",
				decoding: "async",
				fetchPriority: index < 4 ? "high" : "low",
				width: "480",
				height: "640",
				className: "size-full object-cover transition duration-500 group-hover:scale-105"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid size-full place-items-center p-4 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-8 text-cyan-200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display text-lg font-semibold",
					children: card.name
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute left-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 font-mono-ui text-[9px] tracking-[0.14em] text-cyan-100",
				children: card.tier || "COMMON"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate font-display text-lg font-bold",
					children: card.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 truncate text-xs text-muted-foreground",
					children: [
						card.series,
						" · #",
						card.index ?? index + 1
					]
				}),
				global && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 truncate font-mono-ui text-[9px] uppercase tracking-[0.12em] text-fuchsia-200",
					children: ["Trainer: ", card.ownerName || "Unknown"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center justify-between border-t border-white/10 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hof-label",
						children: "Card value"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono-ui text-[10px] text-cyan-200",
						children: formatCoins(card.price)
					})]
				})
			]
		})]
	});
}
function MarketTile({ listing, index, onBuy, busy }) {
	const image = listing.media && /^https?:\/\//.test(listing.media) ? listing.media : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		initial: {
			opacity: 0,
			y: 12
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { delay: Math.min(index * .025, .2) },
		whileHover: { y: -4 },
		className: "aidoru-card-tile group overflow-hidden rounded-2xl border border-fuchsia-300/20 bg-[#07151f]/90 shadow-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-fuchsia-300/20 via-slate-950 to-cyan-300/10",
			children: [image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: image,
				alt: listing.name,
				loading: index < 4 ? "eager" : "lazy",
				decoding: "async",
				fetchPriority: index < 4 ? "high" : "low",
				width: "480",
				height: "640",
				className: "size-full object-cover transition duration-500 group-hover:scale-105"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid size-full place-items-center p-4 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-8 text-fuchsia-200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display text-lg font-semibold",
					children: listing.name
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute left-2 top-2 rounded-full border border-white/20 bg-black/60 px-2 py-1 font-mono-ui text-[9px] tracking-[0.14em] text-fuchsia-100",
				children: listing.tier || "COMMON"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate font-display text-lg font-bold",
					children: listing.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 truncate text-xs text-muted-foreground",
					children: ["Sold by: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold text-fuchsia-100",
						children: listing.sellerName || "Unknown seller"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center justify-between border-t border-white/10 pt-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-mono-ui text-[10px] text-cyan-200",
						children: [formatCoins(listing.price), " coins"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onBuy,
						disabled: busy,
						className: "inline-flex items-center gap-1 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "size-3" }), busy ? "Buying…" : "Buy"]
					})]
				})
			]
		})]
	});
}
function LoadingPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hof-panel py-16 text-center text-sm text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, { className: "mx-auto mb-3 size-8 animate-pulse text-cyan-300" }), "Loading your live card vault…"]
	});
}
function EmptyPanel({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "hof-panel py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, { className: "mx-auto mb-3 size-8 text-cyan-300/70" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-2xl font-semibold",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
				children: body
			})
		]
	});
}
//#endregion
export { CardsPage as component };
