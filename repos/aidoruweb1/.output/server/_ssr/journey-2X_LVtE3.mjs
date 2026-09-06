import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { r as formatCoins } from "./game-qTZOZDmK.mjs";
import { I as Grip, J as Crown, L as Gift, c as Swords, h as Search, it as ArrowUpFromLine, nt as BookOpen, ot as ArrowDownToLine } from "../_libs/lucide-react.mjs";
import { $ as useSession, E as movePartyPokemon, F as reorderParty, Q as useServerFn, U as setLead, et as useSessionWriter, o as claimDailyReward } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { r as UserAvatar, t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as confetti_module_default } from "../_libs/canvas-confetti.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/journey-2X_LVtE3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function JourneyPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Your Journey",
		subtitle: "The same Pokémon party that battles for you in WhatsApp.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JourneyBody, {})
	});
}
function JourneyBody() {
	const { data: user } = useSession();
	const writeSession = useSessionWriter();
	const [firstSlot, setFirstSlot] = (0, import_react.useState)(null);
	const [secondSlot, setSecondSlot] = (0, import_react.useState)(null);
	const [pokedexSearch, setPokedexSearch] = (0, import_react.useState)("");
	const [pokedex, setPokedex] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		fetch("https://pokeapi.co/api/v2/pokemon?limit=1025").then((response) => response.ok ? response.json() : Promise.reject(/* @__PURE__ */ new Error("Pokédex unavailable"))).then((payload) => {
			if (cancelled) return;
			setPokedex((payload.results ?? []).map((entry) => ({
				name: entry.name,
				id: Number(entry.url.split("/").filter(Boolean).pop())
			})).filter((entry) => entry.id > 0));
		}).catch(() => {
			if (!cancelled) setPokedex([]);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	const claim = useServerFn(claimDailyReward);
	const lead = useServerFn(setLead);
	const reorder = useServerFn(reorderParty);
	const move = useServerFn(movePartyPokemon);
	const claimMutation = useMutation({
		mutationFn: () => claim(),
		onSuccess: (result) => {
			writeSession(result.user);
			confetti_module_default({
				particleCount: 90,
				spread: 70,
				colors: ["#18e0e7", "#f8c84e"]
			});
			toast.success(`+${formatCoins(result.reward)} coins · day ${result.streak}`);
		},
		onError: (error) => toast.error(error.message)
	});
	const leadMutation = useMutation({
		mutationFn: (pokemonId) => lead({ data: { pokemonId } }),
		onSuccess: (next) => {
			writeSession(next);
			toast.success("Lead Pokémon updated.");
		},
		onError: (error) => toast.error(error.message)
	});
	const reorderMutation = useMutation({
		mutationFn: () => reorder({ data: {
			first: firstSlot,
			second: secondSlot
		} }),
		onSuccess: (next) => {
			writeSession(next);
			setFirstSlot(null);
			setSecondSlot(null);
			toast.success("Party order updated.");
		},
		onError: (error) => toast.error(error.message)
	});
	const moveMutation = useMutation({
		mutationFn: (data) => move({ data }),
		onSuccess: (next) => {
			writeSession(next);
			toast.success("Trainer party updated.");
		},
		onError: (error) => toast.error(error.message)
	});
	if (!user) return null;
	const party = user.partyPokemon ?? [];
	const pc = user.pcPokemon ?? [];
	const pokedexResults = (0, import_react.useMemo)(() => pokedex.filter((entry) => entry.name.includes(pokedexSearch.trim().toLowerCase())).slice(0, 18), [pokedex, pokedexSearch]);
	const selectedCount = [firstSlot, secondSlot].filter(Boolean).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel relative overflow-hidden p-5 sm:p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -right-20 -top-24 size-64 rounded-full bg-cyan-300/10 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex flex-wrap items-center gap-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
							name: user.name,
							src: user.avatarUrl,
							videoSrc: user.avatarVideoUrl,
							className: "size-20 border-2 border-cyan-300/60"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-kicker",
									children: "Battle trainer"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
									className: "hof-heading mt-1 text-3xl",
									children: [user.name, "'s party"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-muted-foreground",
									children: [
										"Level ",
										user.trainerLevel,
										" · ",
										formatCoins(user.trainerXp),
										" trainer XP · ",
										party.length,
										"/6 party slots"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => claimMutation.mutate(),
							disabled: claimMutation.isPending,
							className: "hof-button inline-flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gift, { className: "size-4" }), claimMutation.isPending ? "Claiming…" : `Daily +250`]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel p-5 sm:p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "National archive"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Pokédex search"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Search the full Pokémon index, then use your owned Pokémon cards below to manage party and PC placement."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "size-7 text-cyan-300" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 text-cyan-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: pokedexSearch,
							onChange: (event) => setPokedexSearch(event.target.value),
							placeholder: "Search Pokémon by name…",
							className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						})]
					}),
					pokedexSearch.trim() && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6",
						children: [pokedexResults.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-white/10 bg-black/15 p-3 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`,
									alt: entry.name,
									loading: "lazy",
									className: "mx-auto size-20 object-contain"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate font-display text-sm font-semibold capitalize",
									children: entry.name.replaceAll("-", " ")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-mono-ui text-[9px] text-cyan-200",
									children: ["#", String(entry.id).padStart(3, "0")]
								})
							]
						}, entry.id)), pokedex.length > 0 && pokedexResults.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "col-span-full text-sm text-muted-foreground",
							children: "No Pokémon matched that search."
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel p-5 sm:p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Battle formation"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Active party"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Tap two slots to swap them, or make a living Pokémon your lead."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swords, { className: "size-7 text-cyan-300" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
						children: [party.map((pokemon, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartyCard, {
							pokemon,
							slot: index + 1,
							lead: user.leadPokemonId === pokemon.id,
							selected: firstSlot === index + 1 || secondSlot === index + 1,
							onSlot: () => {
								if (!firstSlot || firstSlot === index + 1) setFirstSlot(index + 1);
								else setSecondSlot(index + 1);
							},
							onLead: () => leadMutation.mutate(pokemon.id),
							onMove: () => moveMutation.mutate({
								pokemonId: pokemon.id,
								destination: "pc"
							})
						}, pokemon.id)), party.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "No active party found. Start your Pokémon journey in WhatsApp with .startjourney." })]
					}),
					selectedCount === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => reorderMutation.mutate(),
						disabled: reorderMutation.isPending,
						className: "hof-button mt-5",
						children: reorderMutation.isPending ? "Swapping…" : `Swap slots ${firstSlot} and ${secondSlot}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel p-5 sm:p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hof-kicker",
						children: "Trainer storage"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "hof-heading mt-1 text-3xl",
						children: "Your PC"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Grip, { className: "size-7 text-cyan-300" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
					children: [pc.map((pokemon) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PcCard, {
						pokemon,
						onMove: () => moveMutation.mutate({
							pokemonId: pokemon.id,
							destination: "party"
						})
					}, pokemon.id)), pc.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "Your PC is empty. Catch more Pokémon through the bot to expand your collection." })]
				})]
			})
		]
	});
}
function PartyCard({ pokemon, slot, lead, selected, onSlot, onLead, onMove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: `hof-pokemon-card relative overflow-hidden rounded-3xl border p-4 ${lead ? "border-cyan-300/70" : "border-white/10"} ${selected ? "ring-2 ring-amber-300/80" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onSlot,
				className: "absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/60 font-mono-ui text-xs text-cyan-200",
				children: slot
			}),
			lead && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-cyan-300 px-2 py-1 font-mono-ui text-[9px] font-bold text-[#03232e] uppercase",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "size-3" }), " Lead"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: pokemon.imageUrl,
				alt: pokemon.displayName,
				className: "mx-auto h-40 w-full object-contain",
				loading: "lazy"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xl font-bold",
					children: pokemon.nickname || pokemon.displayName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 font-mono-ui text-[10px] text-cyan-200",
					children: [
						"LV ",
						pokemon.level,
						" · ",
						pokemon.hp,
						"/",
						pokemon.maxHp,
						" HP"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onLead,
					disabled: lead,
					className: "hof-tab px-2 py-2 font-mono-ui text-[9px] uppercase disabled:opacity-40",
					children: lead ? "Lead" : "Set lead"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onMove,
					className: "hof-tab inline-flex items-center justify-center gap-1 px-2 py-2 font-mono-ui text-[9px] uppercase",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownToLine, { className: "size-3" }), " PC"]
				})]
			})
		]
	});
}
function PcCard({ pokemon, onMove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "hof-pokemon-card rounded-3xl border border-white/10 p-4 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: pokemon.imageUrl,
				alt: pokemon.displayName,
				className: "mx-auto h-32 w-full object-contain",
				loading: "lazy"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-lg font-bold",
				children: pokemon.nickname || pokemon.displayName
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 font-mono-ui text-[10px] text-muted-foreground",
				children: ["LV ", pokemon.level]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onMove,
				className: "hof-tab mt-4 inline-flex items-center gap-1 px-3 py-2 font-mono-ui text-[9px] uppercase",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpFromLine, { className: "size-3" }), " Add to party"]
			})
		]
	});
}
function EmptyState({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "col-span-full rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted-foreground",
		children: text
	});
}
//#endregion
export { JourneyPage as component };
