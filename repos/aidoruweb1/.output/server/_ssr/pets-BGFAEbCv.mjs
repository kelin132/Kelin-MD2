import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { n as PET_RARITY_LABEL, r as formatCoins, s as petImageForSpecies } from "./game-qTZOZDmK.mjs";
import { F as Heart, U as Egg, r as Utensils, t as X, u as Sparkles, x as PawPrint } from "../_libs/lucide-react.mjs";
import { N as releaseMyPet, Q as useServerFn, T as hatchMyPet, V as selectMyPet, i as buyPetCareItem, j as playWithPet, s as feedMyPet, v as fetchMyPets } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pets-BGFAEbCv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PET_SHOP = [
	{
		key: "kibble",
		name: "Kibble",
		price: 200,
		detail: "+40 hunger"
	},
	{
		key: "meal",
		name: "Premium Meal",
		price: 500,
		detail: "Full hunger · +10 happiness"
	},
	{
		key: "toy",
		name: "Toy",
		price: 300,
		detail: "+35 happiness"
	},
	{
		key: "exppotion",
		name: "EXP Potion",
		price: 800,
		detail: "+150 EXP"
	},
	{
		key: "revival",
		name: "Revival Tonic",
		price: 600,
		detail: "+60 hunger · +40 happiness"
	}
];
function PetsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Pet Lounge",
		subtitle: "Care for the same companions you manage through the bot’s pet commands.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PetsBody, {})
	});
}
function PetsBody() {
	const queryClient = useQueryClient();
	const fetchPets = useServerFn(fetchMyPets);
	const query = useQuery({
		queryKey: ["aidoru", "my-pets"],
		queryFn: () => fetchPets(),
		retry: false
	});
	const [flash, setFlash] = (0, import_react.useState)(null);
	const [busyPet, setBusyPet] = (0, import_react.useState)(null);
	const action = async (petId, fn, message) => {
		setBusyPet(petId);
		setFlash(null);
		try {
			await fn({ data: { petId } });
			await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
			setFlash(message);
		} catch (error) {
			setFlash(error instanceof Error ? error.message : "The pet action could not be completed.");
		} finally {
			setBusyPet(null);
		}
	};
	const feed = useServerFn(feedMyPet);
	const play = useServerFn(playWithPet);
	const select = useServerFn(selectMyPet);
	const release = useServerFn(releaseMyPet);
	const hatch = useServerFn(hatchMyPet);
	const buy = useServerFn(buyPetCareItem);
	const pets = query.data ?? [];
	const active = pets.find((pet) => pet.isActive) ?? pets[0];
	const doHatch = async () => {
		setBusyPet("hatch");
		setFlash(null);
		try {
			await hatch();
			await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
			setFlash("A new companion hatched from the egg.");
		} catch (error) {
			setFlash(error instanceof Error ? error.message : "The egg could not be hatched.");
		} finally {
			setBusyPet(null);
		}
	};
	const doShop = async (itemKey, petId, itemName) => {
		setBusyPet(`${petId}-${itemKey}`);
		setFlash(null);
		try {
			await buy({ data: {
				itemKey,
				petId
			} });
			await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
			setFlash(`${itemName} used successfully.`);
		} catch (error) {
			setFlash(error instanceof Error ? error.message : "The pet-care purchase could not be completed.");
		} finally {
			setBusyPet(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "aidoru-page aidoru-page-pets space-y-6 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel relative overflow-hidden p-5 sm:p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex flex-wrap items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "Companion management"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "hof-heading mt-1 text-4xl",
							children: "Your Pets"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-xl text-sm text-muted-foreground",
							children: "Feed, play, care, hatch, select, and release companions from the same live pet collection."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void doHatch(),
						disabled: busyPet !== null || pets.length >= 5,
						className: "hof-button inline-flex items-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-45",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Egg, { className: "size-4" }), busyPet === "hatch" ? "Hatching…" : "Hatch egg"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
							label: "Stable",
							value: `${pets.length}/5`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
							label: "Active",
							value: active?.name ?? "None"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniStat, {
							label: "Care shop",
							value: "5 items"
						})
					]
				})]
			}),
			flash && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100",
				children: flash
			}),
			query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hof-panel py-16 text-center text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PawPrint, { className: "mx-auto mb-3 size-8 animate-bounce text-cyan-300" }), "Loading your companions…"]
			}),
			query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hof-panel py-16 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PawPrint, { className: "mx-auto mb-3 size-8 text-cyan-300/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl font-semibold",
						children: "Pet stable unavailable"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
						children: "The live pets collection could not be reached. Try refreshing once the shared database is online."
					})
				]
			}),
			!query.isLoading && !query.isError && pets.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hof-panel py-16 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Egg, { className: "mx-auto mb-3 size-8 text-cyan-300/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl font-semibold",
						children: "Your stable is empty"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
						children: "Hatch an egg here or use .adopt in WhatsApp to meet your first companion."
					})
				]
			}),
			pets.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: pets.map((pet) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PetCard, {
					pet,
					busy: busyPet?.startsWith(pet.petId) ?? false,
					onFeed: () => void action(pet.petId, feed, `${pet.name} enjoyed a meal.`),
					onPlay: () => void action(pet.petId, play, `${pet.name} had a playful session.`),
					onSelect: () => void action(pet.petId, select, `${pet.name} is now your active companion.`),
					onRelease: () => {
						if (window.confirm(`Release ${pet.name}? This removes it from your stable.`)) action(pet.petId, release, `${pet.name} was released.`);
					},
					onShop: (key, name) => void doShop(key, pet.petId, name)
				}, pet.petId))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel p-5 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "Bot parity shop"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "hof-heading mt-1 text-3xl",
							children: "Pet care supplies"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Utensils, { className: "size-6 text-cyan-300" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "Prices and effects mirror .petshop. Select a companion card below before buying."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5",
						children: PET_SHOP.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-white/10 bg-black/15 p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-lg font-semibold",
									children: item.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: item.detail
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-3 font-mono-ui text-xs text-cyan-200",
									children: [formatCoins(item.price), " coins"]
								}),
								active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void doShop(item.key, active.petId, item.name),
									disabled: busyPet !== null,
									className: "mt-3 w-full rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-2 font-display text-sm font-semibold text-cyan-100 disabled:opacity-50",
									children: "Use on active"
								})
							]
						}, item.key))
					})
				]
			})
		]
	});
}
function PetCard({ pet, busy, onFeed, onPlay, onSelect, onRelease, onShop }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		layout: true,
		animate: busy ? {
			scale: [
				1,
				1.02,
				1
			],
			rotate: [
				0,
				-1,
				1,
				0
			]
		} : {},
		transition: { duration: .5 },
		className: `hof-panel relative overflow-hidden p-4 sm:p-5 ${pet.isActive ? "border-cyan-300/45" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "aidoru-pet-avatar relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 sm:size-36",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PetImage, { pet }), busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						initial: { opacity: 0 },
						animate: { opacity: [
							0,
							1,
							0
						] },
						transition: {
							repeat: Infinity,
							duration: .8
						},
						className: "absolute inset-0 grid place-items-center bg-cyan-300/20",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-10 text-white" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-kicker",
									children: PET_RARITY_LABEL[pet.rarity] ?? pet.rarity
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "truncate font-display text-2xl font-bold",
									children: pet.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted-foreground",
									children: [
										pet.species,
										" · #",
										pet.petId
									]
								})
							] }), pet.isActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono-ui text-[9px] text-cyan-200",
								children: "ACTIVE"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid grid-cols-2 gap-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
								label: "Hunger",
								value: pet.hunger,
								tone: "bg-amber-300"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
								label: "Happiness",
								value: pet.happiness,
								tone: "bg-pink-300"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 text-xs text-muted-foreground",
							children: [
								"LV ",
								pet.level,
								" · HP ",
								pet.hp,
								"/",
								pet.maxHp,
								" · ATK ",
								pet.attack,
								" · DEF ",
								pet.defense
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onFeed,
						disabled: busy,
						className: "pet-action",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Utensils, { className: "size-3.5" }), "Feed"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onPlay,
						disabled: busy,
						className: "pet-action",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "size-3.5" }), "Play"]
					}),
					!pet.isActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onSelect,
						disabled: busy,
						className: "pet-action",
						children: "Select"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: onRelease,
						disabled: busy,
						className: "pet-action border-rose-300/20 text-rose-100",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-3.5" }), "Release"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: PET_SHOP.slice(0, 3).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onShop(item.key, item.name),
					disabled: busy,
					className: "rounded-full border border-white/10 px-3 py-1.5 font-mono-ui text-[9px] text-muted-foreground transition hover:border-cyan-300/30 hover:text-cyan-100",
					children: item.name
				}, item.key))
			})
		]
	});
}
function PetImage({ pet }) {
	const fallback = petImageForSpecies(pet.species, pet.name) ?? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(pet.name)}`;
	const [src, setSrc] = (0, import_react.useState)(pet.imageUrl || fallback);
	(0, import_react.useEffect)(() => setSrc(pet.imageUrl || fallback), [pet.imageUrl, fallback]);
	if (!src) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PawPrint, { className: "size-12 text-cyan-200" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src,
		alt: pet.name,
		loading: "lazy",
		className: "size-full object-contain p-3",
		onError: () => setSrc((current) => current === fallback ? "" : fallback)
	});
}
function Progress({ label, value, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1 flex justify-between font-mono-ui text-[9px] text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [value, "%"] })]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-1.5 overflow-hidden rounded-full bg-white/10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `h-full rounded-full ${tone}`,
			style: { width: `${value}%` }
		})
	})] });
}
function MiniStat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-white/10 bg-black/15 px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "hof-label",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 truncate font-mono-ui text-xs font-bold text-cyan-100",
			children: value
		})]
	});
}
//#endregion
export { PetsPage as component };
