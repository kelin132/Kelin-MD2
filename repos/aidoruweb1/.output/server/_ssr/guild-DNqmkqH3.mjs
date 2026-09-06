import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { r as formatCoins, t as GUILD_CREATION_COST } from "./game-qTZOZDmK.mjs";
import { E as LogOut, H as ExternalLink, J as Crown, Q as CircleArrowUp, X as Coins, b as Plus, i as Users, l as Star, p as ShieldCheck, u as Sparkles } from "../_libs/lucide-react.mjs";
import { $ as useSession, I as requestJoinGuild, L as requestLeaveGuild, Q as useServerFn, X as upgradeMyGuild, Y as updateGuildSettings, a as charterGuild, et as useSessionWriter, m as fetchGuilds } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { r as UserAvatar, t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guild-DNqmkqH3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var GUILD_WEBSITE_URL = "https://aidoru.zone.id/guild";
function GuildPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Guild System",
		subtitle: "A soft-lit anime guild hall for your bot-synced crew.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GuildBody, {})
	});
}
function ProgressBar({ value, tone = "pink" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-background/60 h-2 overflow-hidden rounded-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: { width: 0 },
			animate: { width: `${Math.max(0, Math.min(100, value))}%` },
			transition: {
				duration: .7,
				ease: "easeOut"
			},
			className: `h-full rounded-full ${tone === "cyan" ? "bg-gradient-to-r from-cyan-300 to-sky-400" : "bg-gradient-to-r from-fuchsia-300 to-pink-400"}`
		})
	});
}
function GuildBody() {
	const { data: user } = useSession();
	const writeSession = useSessionWriter();
	const queryClient = useQueryClient();
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		tag: "",
		description: ""
	});
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [editForm, setEditForm] = (0, import_react.useState)({
		description: "",
		iconUrl: "",
		bannerUrl: ""
	});
	const fetchGuildsFn = useServerFn(fetchGuilds);
	const guildsQuery = useQuery({
		queryKey: ["aidoru", "guilds"],
		queryFn: () => fetchGuildsFn(),
		retry: false
	});
	const join = useServerFn(requestJoinGuild);
	const leave = useServerFn(requestLeaveGuild);
	const charter = useServerFn(charterGuild);
	const upgrade = useServerFn(upgradeMyGuild);
	const updateSettings = useServerFn(updateGuildSettings);
	const refresh = () => queryClient.invalidateQueries({ queryKey: ["aidoru", "guilds"] });
	const joinMutation = useMutation({
		mutationFn: (guildId) => join({ data: { guildId } }),
		onSuccess: (nextUser) => {
			writeSession(nextUser);
			refresh();
			toast.success("Joined the guild");
		},
		onError: (error) => toast.error(error.message)
	});
	const leaveMutation = useMutation({
		mutationFn: () => leave(),
		onSuccess: (nextUser) => {
			writeSession(nextUser);
			refresh();
			toast.success("You left the guild");
		},
		onError: (error) => toast.error(error.message)
	});
	const createMutation = useMutation({
		mutationFn: () => charter({ data: form }),
		onSuccess: (nextUser) => {
			writeSession(nextUser);
			refresh();
			setCreating(false);
			setForm({
				name: "",
				tag: "",
				description: ""
			});
			toast.success("Guild chartered");
		},
		onError: (error) => toast.error(error.message)
	});
	const upgradeMutation = useMutation({
		mutationFn: () => upgrade(),
		onSuccess: (nextUser) => {
			writeSession(nextUser);
			refresh();
			toast.success("Guild upgraded!");
		},
		onError: (error) => toast.error(error.message)
	});
	const updateMutation = useMutation({
		mutationFn: () => updateSettings({ data: editForm }),
		onSuccess: (nextUser) => {
			writeSession(nextUser);
			refresh();
			setEditing(null);
			toast.success("Guild settings updated");
		},
		onError: (error) => toast.error(error.message)
	});
	if (!user) return null;
	const currentGuild = (guildsQuery.data ?? []).find((guild) => guild.isMember);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass-strong relative overflow-hidden rounded-[2rem] p-6 sm:p-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-14 -top-20 size-64 rounded-full bg-fuchsia-300/10 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex flex-wrap items-center gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "bg-gradient-brand grid size-14 place-items-center rounded-2xl shadow-[0_0_28px_rgba(244,114,182,0.28)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-6" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-52 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono-ui text-muted-foreground text-[10px] tracking-[0.24em] uppercase",
									children: "Your guild standing"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-2xl font-bold",
									children: currentGuild?.name ?? "Unaffiliated"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground mt-1 text-sm",
									children: currentGuild ? `Level ${currentGuild.level} · ${currentGuild.memberCount}/${currentGuild.memberCapacity} members · ${(currentGuild.taxRate * 100).toFixed(0)}% guild tax` : "Find a guild or charter a new anime crew."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								currentGuild ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: GUILD_WEBSITE_URL,
									target: "_blank",
									rel: "noreferrer",
									className: "glass glass-hover flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3.5" }), " Public guild"]
								}) : null,
								currentGuild ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => leaveMutation.mutate(),
									disabled: leaveMutation.isPending,
									className: "glass glass-hover hover:text-destructive flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-50",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "size-3.5" }), " Leave"]
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setCreating((value) => !value),
									className: "bg-gradient-brand text-foreground flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-bold tracking-[0.14em] uppercase transition-transform active:scale-[0.97]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-3.5" }), " Charter guild"]
								})
							]
						})
					]
				})]
			}),
			creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: -10
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "glass overflow-hidden rounded-[2rem] p-6 sm:p-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "text-neon-pink size-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-xl font-bold",
							children: "Charter an anime guild"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-muted-foreground mt-1 text-sm",
							children: [
								"Costs ",
								formatCoins(GUILD_CREATION_COST),
								" coins. Grow its XP and treasury through work on the bot."
							]
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 grid gap-3 md:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: form.name,
								onChange: (event) => setForm({
									...form,
									name: event.target.value
								}),
								placeholder: "Guild name",
								className: "glass rounded-2xl px-4 py-3 text-sm outline-none"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: form.tag,
								onChange: (event) => setForm({
									...form,
									tag: event.target.value.toUpperCase()
								}),
								placeholder: "TAG",
								maxLength: 5,
								className: "glass font-mono-ui rounded-2xl px-4 py-3 text-sm tracking-[0.2em] outline-none"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: form.description,
								onChange: (event) => setForm({
									...form,
									description: event.target.value
								}),
								placeholder: "What is this guild about?",
								rows: 3,
								className: "glass resize-none rounded-2xl px-4 py-3 text-sm outline-none md:col-span-2"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => createMutation.mutate(),
						disabled: createMutation.isPending,
						className: "bg-gradient-brand text-foreground glow-pink mt-5 rounded-full px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase transition-transform active:scale-[0.97] disabled:opacity-50",
						children: createMutation.isPending ? "Chartering…" : "Create guild"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono-ui text-muted-foreground text-[10px] tracking-[0.24em] uppercase",
					children: "Guild hall"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display mt-1 text-2xl font-bold",
					children: "Find your constellation"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: GUILD_WEBSITE_URL,
					target: "_blank",
					rel: "noreferrer",
					className: "text-muted-foreground hover:text-foreground hidden items-center gap-2 text-xs sm:flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "size-3.5" }), " View guild portal"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 md:grid-cols-2 xl:grid-cols-3",
				children: [
					guildsQuery.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass col-span-full p-8 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-neon-pink text-sm font-bold",
								children: "Failed to load guilds"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground mt-1 text-xs",
								children: guildsQuery.error?.message || "Internal server error"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => void guildsQuery.refetch(),
								className: "mt-4 text-xs underline",
								children: "Try again"
							})
						]
					}),
					guildsQuery.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "col-span-full py-12 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "border-brand-primary/30 border-t-brand-primary mx-auto size-8 animate-spin rounded-full border-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted-foreground mt-4 text-xs",
							children: "Scanning constellations..."
						})]
					}),
					!guildsQuery.isLoading && !guildsQuery.isError && (guildsQuery.data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "glass col-span-full p-12 text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted-foreground text-sm",
							children: "No guilds found. Be the first to charter one!"
						})
					}),
					(guildsQuery.data ?? []).map((guild, index) => {
						const xpProgress = guild.guildXpRequired > 0 ? guild.guildXp / guild.guildXpRequired * 100 : 100;
						const treasuryProgress = guild.upgradeTreasuryRequired > 0 ? guild.bank / guild.upgradeTreasuryRequired * 100 : 100;
						const ready = guild.guildXp >= guild.guildXpRequired && guild.bank >= guild.upgradeTreasuryRequired && guild.memberCount >= guild.upgradeMembersRequired;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
							initial: {
								opacity: 0,
								y: 16
							},
							animate: {
								opacity: 1,
								y: 0
							},
							transition: {
								duration: .35,
								delay: Math.min(index, 8) * .05
							},
							className: `glass glass-hover relative flex flex-col overflow-hidden rounded-[2rem] p-6 ${guild.isMember ? "border-neon-pink/60 shadow-[0_0_30px_rgba(244,114,182,0.12)]" : ""}`,
							children: [
								guild.iconUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-x-0 top-0 h-32 bg-cover bg-center opacity-35",
									style: { backgroundImage: `linear-gradient(180deg, transparent, rgba(4, 19, 27, 0.98)), url(${JSON.stringify(guild.iconUrl)})` },
									"aria-hidden": "true"
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative flex items-start gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "bg-gradient-brand font-mono-ui grid size-12 shrink-0 place-items-center rounded-2xl text-xs font-bold tracking-widest",
											children: guild.tag
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-display truncate text-lg font-bold",
													children: guild.name
												}), guild.isOwner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "text-rarity-legend size-4 shrink-0" }) : null]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-muted-foreground font-mono-ui text-[10px] tracking-[0.18em] uppercase",
												children: [
													"Level ",
													guild.level,
													" · ",
													guild.memberCount,
													"/",
													guild.memberCapacity,
													" members"
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "glass font-mono-ui rounded-full px-2.5 py-1 text-[10px]",
											children: [(guild.taxRate * 100).toFixed(0), "% tax"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "relative mt-4 min-h-10 flex-1 text-sm text-muted-foreground",
									children: guild.description || "A new constellation waiting for its first story."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative mt-5 space-y-3 rounded-2xl bg-background/20 p-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-1.5 flex items-center justify-between text-[11px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "text-neon-pink size-3.5" }), " Guild XP"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono-ui text-muted-foreground",
											children: [
												guild.guildXp.toLocaleString(),
												" / ",
												guild.guildXpRequired.toLocaleString()
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBar, { value: xpProgress })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-1.5 flex items-center justify-between text-[11px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "text-neon-pink size-3.5" }), " Treasury"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono-ui text-muted-foreground",
											children: [
												formatCoins(guild.bank),
												" / ",
												formatCoins(guild.upgradeTreasuryRequired)
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBar, {
										value: treasuryProgress,
										tone: "cyan"
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative mt-4 grid grid-cols-2 gap-2 text-[11px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "glass rounded-xl px-3 py-2",
										children: ["Next level ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "ml-1",
											children: guild.level + 1
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "glass rounded-xl px-3 py-2",
										children: ["Crew goal ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "ml-1",
											children: guild.upgradeMembersRequired
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative mt-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-2 flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5 text-[11px] font-semibold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "size-3.5" }), " Members"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted-foreground text-[10px]",
											children: [guild.memberCount, " names synced"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-2",
										children: guild.members.slice(0, 8).map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "group flex items-center gap-1.5",
											title: member.name,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
												name: member.name,
												src: member.avatarUrl,
												videoSrc: member.avatarVideoUrl,
												className: "size-7 border border-white/15"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "max-w-20 truncate text-[10px]",
												children: member.name
											})]
										}, member.id))
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative mt-5 flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "glass font-mono-ui flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "text-neon-pink size-3.5" }),
												" ",
												formatCoins(guild.bank)
											]
										}),
										ready && guild.isOwner ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => upgradeMutation.mutate(),
											disabled: upgradeMutation.isPending,
											className: "text-emerald-200 hover:text-emerald-100 flex items-center gap-1 text-[10px] font-semibold transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowUp, { className: "size-3.5" }), " Upgrade"]
										}) : ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-emerald-200 flex items-center gap-1 text-[10px] font-semibold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowUp, { className: "size-3.5" }), " Upgrade ready"]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground text-[10px]",
											children: "Reqs not met"
										}),
										guild.isOwner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												setEditing(guild.id);
												setEditForm({
													description: guild.description,
													iconUrl: guild.iconUrl || "",
													bannerUrl: ""
												});
											},
											className: "glass glass-hover rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase",
											children: "Settings"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => joinMutation.mutate(guild.id),
											disabled: guild.isMember || joinMutation.isPending,
											className: "bg-gradient-brand text-foreground ml-auto rounded-full px-5 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition-transform active:scale-[0.97] disabled:opacity-40",
											children: guild.isMember ? "Joined" : "Join"
										})
									]
								}),
								editing === guild.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
									initial: {
										opacity: 0,
										height: 0
									},
									animate: {
										opacity: 1,
										height: "auto"
									},
									className: "relative mt-4 space-y-3 border-t border-white/10 pt-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: editForm.iconUrl,
											onChange: (e) => setEditForm({
												...editForm,
												iconUrl: e.target.value
											}),
											placeholder: "Icon URL",
											className: "glass w-full rounded-xl px-3 py-2 text-xs outline-none"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											value: editForm.description,
											onChange: (e) => setEditForm({
												...editForm,
												description: e.target.value
											}),
											placeholder: "Description",
											rows: 2,
											className: "glass w-full resize-none rounded-xl px-3 py-2 text-xs outline-none"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => updateMutation.mutate(),
												disabled: updateMutation.isPending,
												className: "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex-1 rounded-xl py-2 text-[10px] font-bold uppercase transition-colors",
												children: "Save"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setEditing(null),
												className: "glass flex-1 rounded-xl py-2 text-[10px] font-bold uppercase",
												children: "Cancel"
											})]
										})
									]
								})
							]
						}, guild.id);
					})
				]
			})
		]
	});
}
//#endregion
export { GuildPage as component };
