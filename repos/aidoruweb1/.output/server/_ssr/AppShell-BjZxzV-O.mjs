import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { o as useRouterState, p as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as rankFromLevel, i as formatCompactCoins, l as trainerLevelProgress } from "./game-qTZOZDmK.mjs";
import { $ as ChevronRight, A as LayoutDashboard, E as LogOut, G as Dices, R as GalleryHorizontalEnd, T as Menu, a as UserRound, c as Swords, f as ShoppingBag, i as Users, t as X, u as Sparkles, x as PawPrint } from "../_libs/lucide-react.mjs";
import { $ as useSession, Z as useLogout, t as ConnectionNotice } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AppShell-BjZxzV-O.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function initials(name) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const first = parts[0] ?? "A";
	const last = parts[parts.length - 1] ?? first;
	return (parts.length > 1 ? `${first[0] ?? "A"}${last[0] ?? "A"}` : first.slice(0, 2)).toUpperCase();
}
function UserAvatar({ name = "AIDORU", src, videoSrc, className, imageClassName }) {
	const [failed, setFailed] = (0, import_react.useState)(false);
	const [videoFailed, setVideoFailed] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setFailed(false);
		setVideoFailed(false);
	}, [src, videoSrc]);
	const hasVideo = Boolean(videoSrc && !videoFailed);
	const hasImage = Boolean(src && !failed);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("aidoru-avatar", className),
		"aria-label": `${name ?? "User"} profile picture`,
		children: hasVideo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			src: videoSrc ?? void 0,
			className: cn("h-full w-full object-cover", imageClassName),
			autoPlay: true,
			loop: true,
			muted: true,
			playsInline: true,
			preload: "metadata",
			"aria-label": "Animated profile picture",
			onError: () => setVideoFailed(true)
		}) : hasImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: src ?? void 0,
			alt: "",
			className: cn("h-full w-full object-cover", imageClassName),
			loading: "lazy",
			referrerPolicy: "no-referrer",
			onError: () => setFailed(true)
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "aidoru-avatar-fallback",
			children: initials(name ?? "AIDORU")
		})
	});
}
var NAV = [
	{
		to: "/dashboard",
		label: "Leaderboards",
		icon: LayoutDashboard
	},
	{
		to: "/profile",
		label: "Profile",
		icon: UserRound
	},
	{
		to: "/cards",
		label: "Cards",
		icon: GalleryHorizontalEnd
	},
	{
		to: "/pets",
		label: "Pets",
		icon: PawPrint
	},
	{
		to: "/journey",
		label: "Journey",
		icon: Sparkles
	},
	{
		to: "/mart",
		label: "Shop",
		icon: ShoppingBag
	},
	{
		to: "/guild",
		label: "Guild",
		icon: Users
	},
	{
		to: "/arcade",
		label: "Arcade",
		icon: Dices
	},
	{
		to: "/battle",
		label: "Battle",
		icon: Swords
	}
];
function AppShell({ title, subtitle, children }) {
	const { data: user, error: sessionError, isLoading } = useSession();
	const logout = useLogout();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMenuOpen(false);
	}, [pathname]);
	(0, import_react.useEffect)(() => {
		const closeOnEscape = (event) => {
			if (event.key === "Escape") setMenuOpen(false);
		};
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!isLoading && user === null) {
			const isBattleRoute = pathname === "/battle" || pathname.startsWith("/battle/");
			const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
			if (!(isBattleRoute || isDashboardRoute)) window.location.replace("/");
		}
	}, [
		isLoading,
		user,
		pathname
	]);
	if (sessionError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionNotice, {
		error: sessionError,
		onRetry: () => window.location.reload()
	});
	const isBattleRoute = pathname === "/battle" || pathname.startsWith("/battle/");
	const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
	if (isLoading || !user && !(isBattleRoute || isDashboardRoute)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "hof-kicker",
			children: "Loading AIDORU"
		})
	});
	const progress = user ? trainerLevelProgress(user.trainerLevel, user.trainerXp) : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("min-h-screen bg-background aidoru-app", `aidoru-app-${pathname.replace(/^\//, "").replaceAll("/", "-") || "home"}`),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-40 border-b border-white/10 bg-background/85 px-3 py-3 backdrop-blur-xl sm:px-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-[1180px] items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Open navigation",
							"aria-expanded": menuOpen,
							onClick: () => setMenuOpen(true),
							className: "grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:border-cyan-300/45 hover:text-cyan-200 sm:hidden",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/dashboard",
							className: "flex shrink-0 items-center gap-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hof-heading text-2xl tracking-[0.16em]",
								children: "AIDORU"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "ml-5 hidden items-center gap-1 lg:flex",
							children: NAV.map(({ to, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to,
								className: cn("rounded-lg px-3 py-2 font-display text-sm font-semibold transition", pathname === to ? "bg-cyan-300/10 text-cyan-200" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"),
								children: label
							}, to))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-2 sm:gap-3",
							children: [user && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 sm:flex",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "hof-label",
										children: "$"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono-ui text-xs text-cyan-200",
										children: formatCompactCoins(user.coins)
									})]
								}),
								progress && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 md:flex",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "hof-label",
										children: ["LV ", progress.level]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono-ui text-xs text-muted-foreground",
										children: rankFromLevel(progress.level)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/profile",
									"aria-label": "Open your profile",
									className: "rounded-full outline-none ring-cyan-300/60 focus-visible:ring-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
										name: user.name,
										src: user.avatarUrl,
										videoSrc: user.avatarVideoUrl,
										className: "size-10 border-cyan-300/50"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => logout.mutate(),
									"aria-label": "Sign out",
									className: "hidden size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:text-cyan-200 sm:grid",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" })
								})
							] }), !user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/",
								className: "bg-gradient-brand text-foreground inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold",
								children: "Sign in"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("aidoru-mobile-menu fixed inset-0 z-50 transition", menuOpen ? "pointer-events-auto" : "pointer-events-none"),
				"aria-hidden": !menuOpen,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "Close navigation",
					onClick: () => setMenuOpen(false),
					className: cn("absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity", menuOpen ? "opacity-100" : "opacity-0")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: cn("aidoru-mobile-menu-panel absolute right-0 top-0 flex h-full min-h-0 w-[min(88vw,22rem)] flex-col overflow-hidden border-l border-cyan-300/15 bg-[#07151f]/96 p-5 shadow-2xl backdrop-blur-2xl transition-[transform,opacity] duration-300 ease-out", menuOpen ? "translate-x-0" : "translate-x-full"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Menu"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-heading mt-1 text-2xl",
								children: "AIDORU"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Close navigation",
								onClick: () => setMenuOpen(false),
								className: "grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-cyan-300/45 hover:text-cyan-200",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
							})]
						}),
						user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 rounded-2xl border border-cyan-300/18 bg-cyan-300/7 p-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
									name: user.name,
									src: user.avatarUrl,
									videoSrc: user.avatarVideoUrl,
									className: "size-14 border-cyan-300/50"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate font-display text-xl font-bold",
											children: user.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-xs text-muted-foreground",
											children: user.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 font-mono-ui text-[9px] tracking-[0.12em] text-cyan-200",
											children: "WHATSAPP LINKED"
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileStat, {
										label: "Coins",
										value: formatCompactCoins(user.coins)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileStat, {
										label: "Level",
										value: `${progress?.level || 1}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileStat, {
										label: "Party",
										value: `${user.partyPokemon.length}/6`
									})
								]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 rounded-2xl border border-cyan-300/18 bg-cyan-300/7 p-6 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "hof-kicker",
									children: "Welcome, Trainer"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground mt-2 text-sm",
									children: "Sign in to unlock your full profile and collection."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: "/",
									className: "bg-gradient-brand text-foreground mt-4 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold",
									children: "Sign in"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-3 pr-1",
							children: NAV.map(({ to, label, icon: Icon }) => {
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to,
									onClick: () => setMenuOpen(false),
									className: cn("menu-nav-link flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200", pathname === to ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]" : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground"),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "flex-1 font-display text-lg font-semibold",
											children: label
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4 opacity-45" })
									]
								}, to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => logout.mutate(),
							disabled: logout.isPending,
							className: "menu-signout mt-auto flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/7 px-4 py-3 font-display text-base font-semibold text-rose-100 transition hover:bg-rose-300/12 disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-4" }), logout.isPending ? "Signing out…" : "Sign out"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "aidoru-route-main mx-auto max-w-[1180px] px-3 pt-8 sm:px-6 sm:pt-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: "Trainer hub"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "hof-heading mt-1 text-4xl sm:text-5xl",
							children: title
						}),
						subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 max-w-2xl text-sm text-muted-foreground",
							children: subtitle
						})
					]
				}), children]
			})
		]
	});
}
function ProfileStat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "hof-label truncate",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 truncate font-mono-ui text-xs font-bold text-cyan-100",
			children: value
		})]
	});
}
function PokeballMark({ small = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `pokeball-mark ${small ? "pokeball-mark-small" : ""}`,
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pokeball-mark-band" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pokeball-mark-button" })]
	});
}
//#endregion
export { PokeballMark as n, UserAvatar as r, AppShell as t };
