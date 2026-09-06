import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { l as Outlet, o as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as LoaderCircle, V as Eye, Z as Clipboard, at as ArrowRight, b as Plus, c as Swords, et as Check, i as Users } from "../_libs/lucide-react.mjs";
import { D as openBattleRoom, O as openGymRoom, Q as useServerFn, h as fetchGyms, l as fetchBattleRooms } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { n as PokeballMark, t as AppShell } from "./AppShell-BjZxzV-O.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/battle-D5-At1VY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BattleLobbyPage() {
	if (useRouterState({ select: (state) => state.location.pathname }).startsWith("/battle/")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Pokémon Battle",
		subtitle: "Create a match, join a room, or spectate a live battle.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleLobby, {})
	});
}
function BattleLobby() {
	const queryClient = useQueryClient();
	const [view, setView] = (0, import_react.useState)("play");
	const [copied, setCopied] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		const roomId = params.get("room") || params.get("code");
		if (roomId) window.location.replace(`/battle/${encodeURIComponent(decodeRoomReference(roomId))}`);
	}, []);
	const listRooms = useServerFn(fetchBattleRooms);
	const openRoom = useServerFn(openBattleRoom);
	const listGyms = useServerFn(fetchGyms);
	const openGym = useServerFn(openGymRoom);
	const query = useQuery({
		queryKey: ["aidoru", "battle-rooms"],
		queryFn: () => listRooms(),
		refetchInterval: 4e3,
		retry: false
	});
	const mutation = useMutation({
		mutationFn: () => openRoom(),
		onSuccess: (room) => {
			queryClient.invalidateQueries({ queryKey: ["aidoru", "battle-rooms"] });
			window.location.assign(battleRoomPath(room.code));
		}
	});
	const gymQuery = useQuery({
		queryKey: ["aidoru", "gyms"],
		queryFn: () => listGyms(),
		retry: false
	});
	const gymMutation = useMutation({
		mutationFn: (gymId) => openGym({ data: { gymId } }),
		onSuccess: (room) => window.location.assign(battleRoomPath(room.code))
	});
	const rooms = query.data ?? [];
	const gyms = gymQuery.data ?? [];
	const activeRooms = rooms.filter((room) => room.status === "active");
	const copy = (value, key) => {
		navigator.clipboard?.writeText(value).then(() => {
			setCopied(key);
			window.setTimeout(() => setCopied((current) => current === key ? null : current), 1600);
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "aidoru-page aidoru-page-battle battle-lobby-page pb-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "battle-lobby-heading",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "battle-lobby-heading-mark",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PokeballMark, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "AIDORU arena"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "battle-lobby-title",
							children: "Pokémon Battle"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "battle-lobby-subtitle",
							children: "Create a match or watch trainers fight live."
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "battle-online-pill",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-online-dot" }), "Online"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "battle-room",
				className: "battle-room-panel hof-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleLobbyBackdrop, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-panel-heading",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Battle room"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "battle-panel-title",
								children: "Find your next match"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "battle-room-count",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-3.5" }),
									rooms.length,
									" open"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "battle-view-tabs",
							role: "tablist",
							"aria-label": "Battle room views",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": view === "play",
								onClick: () => setView("play"),
								className: `battle-view-tab ${view === "play" ? "battle-view-tab-active" : ""}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swords, { className: "size-4" }), "Play"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "tab",
								"aria-selected": view === "watch",
								onClick: () => setView("watch"),
								className: `battle-view-tab ${view === "watch" ? "battle-view-tab-active" : ""}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }),
									"Spectate ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "battle-view-count",
										children: activeRooms.length
									})
								]
							})]
						}),
						view === "play" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "battle-play-copy",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Create a match and send the room link to another signed-in trainer." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "battle-play-hint",
									children: "The first trainer who opens your code joins automatically."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => mutation.mutate(),
								disabled: mutation.isPending,
								className: "battle-primary-button",
								children: [mutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" }), mutation.isPending ? "Creating match…" : "Create a match"]
							}),
							mutation.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "battle-inline-error",
								children: mutation.error instanceof Error ? mutation.error.message : "Unable to create a battle room."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinBattleCard, {})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WatchRooms, {
							rooms,
							loading: query.isLoading,
							error: query.isError,
							onCopy: copy,
							copied
						})
					]
				})]
			}),
			view === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "hof-panel mt-5 p-5 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 flex items-end justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Badge circuit"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "battle-panel-title",
								children: "Challenge a gym"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm leading-6 text-slate-300",
								children: "Every gym keeps the same reliable battle controls, but has its own leader, team, theme, badge, and reward."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100 sm:inline-flex",
							children: [
								gyms.filter((gym) => gym.earned).length,
								"/",
								gyms.length,
								" badges"
							]
						})]
					}),
					gymQuery.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "battle-empty battle-empty-compact",
						children: "Loading gyms…"
					}) : gymQuery.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "battle-inline-error",
						children: "Start your Pokémon journey in WhatsApp to unlock the Gym Circuit."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: gyms.map((gym) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "rounded-2xl border border-white/10 bg-slate-950/55 p-4",
							style: { "--gym-accent": gym.accent },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs uppercase tracking-[0.2em] text-slate-400",
											children: [gym.type, " gym"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "mt-1 font-display text-xl font-bold text-white",
											children: gym.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "mt-1 text-sm text-slate-300",
											children: ["Leader ", gym.leader]
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full border border-white/10 px-2 py-1 text-xs text-slate-200",
										children: gym.earned ? "Badge earned" : gym.unlocked ? "Unlocked" : "Locked"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-6 text-slate-400",
									children: gym.description
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex items-center justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-cyan-100",
										children: [
											gym.badge,
											" · ",
											gym.rewardCoins.toLocaleString(),
											" coins"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !gym.unlocked || gymMutation.isPending,
										onClick: () => gymMutation.mutate(gym.id),
										className: "rounded-full px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40",
										style: { background: gym.accent },
										children: gymMutation.isPending ? "Opening…" : gym.earned ? "Rematch" : "Challenge"
									})]
								})
							]
						}, gym.id))
					}),
					gymMutation.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 battle-inline-error",
						children: gymMutation.error instanceof Error ? gymMutation.error.message : "Unable to open the gym arena."
					})
				]
			}),
			view === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "battle-watch-preview hof-panel",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hof-kicker",
						children: "Spectator feed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "battle-panel-title",
						children: "Spectate live battles"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-6 text-slate-300",
						children: "Spectate is read-only mode. You can follow the arena, combat log, party health, and every move without taking a trainer seat."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setView("watch"),
					className: "hof-button-secondary inline-flex items-center gap-2 whitespace-nowrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }), "Open Spectate"]
				})]
			})
		]
	});
}
function JoinBattleCard() {
	const [roomCode, setRoomCode] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const join = (event) => {
		event.preventDefault();
		const normalized = normalizeRoomInput(roomCode);
		if (!normalized) {
			setError("Enter a six-character room code or paste a battle-room link.");
			return;
		}
		setError(null);
		window.location.assign(battleRoomPath(normalized));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-join-section",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "battle-divider",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "or join with a code" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: join,
				className: "battle-join-form",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "sr-only",
						htmlFor: "battle-room-code",
						children: "Room code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "battle-room-code",
						value: roomCode,
						onChange: (event) => setRoomCode(event.target.value.toUpperCase()),
						placeholder: "6-character room code",
						className: "battle-room-input",
						autoComplete: "off",
						maxLength: 64
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "submit",
						className: "battle-secondary-button",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Join room" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
					})
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "battle-inline-error",
				children: error
			})
		]
	});
}
function WatchRooms({ rooms, loading, error, onCopy, copied }) {
	const active = rooms.filter((room) => room.status === "active");
	const waiting = rooms.filter((room) => room.status === "waiting");
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-empty battle-empty-compact",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-6 animate-spin text-cyan-200" }), "Scanning live rooms…"]
	});
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "battle-empty battle-empty-compact text-rose-100",
		children: "The spectator feed is offline. Try again in a moment."
	});
	if (rooms.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-empty battle-empty-compact",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-6 text-cyan-200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "No rooms are open yet. Create the first match." })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-watch-list",
		children: [
			active.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "battle-list-label",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-live-dot" }), "Live now"]
			}),
			active.map((room) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleRoomCard, {
				room,
				onCopy,
				copied
			}, room.id)),
			waiting.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "battle-list-label battle-list-label-waiting",
				children: "Waiting for a trainer"
			}),
			waiting.map((room) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleRoomCard, {
				room,
				onCopy,
				copied
			}, room.id))
		]
	});
}
function BattleRoomCard({ room, onCopy, copied }) {
	const roomUrl = `${typeof window === "undefined" ? "" : window.location.origin}${battleRoomPath(room.code)}`;
	const isLive = room.status === "active";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "battle-room-card battle-room-card-reference",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-room-card-top",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `battle-status battle-status-${room.status}`,
					children: isLive ? "Live" : "Open"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "battle-room-code-label",
					children: ["Code ", room.code]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "battle-room-spectators",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-3.5" }),
						room.spectators,
						" watching"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-room-matchup",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrainerMini, {
						name: room.challenger.name,
						avatar: room.challenger.avatarUrl
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "battle-vs",
						children: "VS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrainerMini, {
						name: room.opponent?.name ?? "Waiting",
						avatar: room.opponent?.avatarUrl ?? null,
						align: "right"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-room-card-actions",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: battleRoomPath(room.code),
					className: "battle-primary-button battle-card-action",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-4" }), isLive ? "Spectate" : "Join room"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onCopy(roomUrl, room.id),
					className: "battle-secondary-button battle-card-action",
					children: copied === room.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), "Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clipboard, { className: "size-4" }), "Copy link"] })
				})]
			})
		]
	});
}
function normalizeRoomInput(value) {
	const input = value.trim();
	if (!input) return "";
	return decodeRoomReference(input.match(/(?:[?&](?:code|room)=|\/battle\/)([a-z0-9-]+)/i)?.[1] ?? input);
}
function decodeRoomReference(value) {
	try {
		return decodeURIComponent(value).replace(/^\/+|\/+$/g, "").trim();
	} catch {
		return value.replace(/^\/+|\/+$/g, "").trim();
	}
}
function battleRoomPath(roomReference) {
	return `/battle?room=${encodeURIComponent(decodeRoomReference(roomReference))}`;
}
function BattleLobbyBackdrop() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-lobby-backdrop",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "battle-lobby-nebula" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "battle-lobby-grid" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "battle-lobby-particle-cloud",
				children: Array.from({ length: 18 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: {
					["--particle-index"]: index,
					["--particle-top"]: `${8 + index * 4.8}%`,
					["--particle-left"]: `${3 + index * 17 % 94}%`
				} }, index))
			}),
			[
				{
					name: "Pikachu",
					src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
					className: "battle-lobby-pokemon battle-lobby-pikachu"
				},
				{
					name: "Dragonite",
					src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png",
					className: "battle-lobby-pokemon battle-lobby-dragonite"
				},
				{
					name: "Charizard",
					src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
					className: "battle-lobby-pokemon battle-lobby-charizard"
				},
				{
					name: "Jigglypuff",
					src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png",
					className: "battle-lobby-pokemon battle-lobby-jigglypuff"
				}
			].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				className: item.className,
				src: item.src,
				alt: ""
			}, item.name))
		]
	});
}
function TrainerMini({ name, avatar, align = "left" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "battle-avatar",
			children: avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: avatar,
				alt: "",
				loading: "lazy"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PokeballMark, { small: true })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "truncate font-display text-lg font-bold",
			children: name
		})]
	});
}
//#endregion
export { BattleLobbyPage as component };
