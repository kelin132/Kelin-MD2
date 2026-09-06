import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, n as useQuery, o as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { i as formatCompactCoins } from "./game-qTZOZDmK.mjs";
import { C as PackageOpen, J as Crown, X as Coins, j as Layers, s as Trophy } from "../_libs/lucide-react.mjs";
import { $ as useSession, Q as useServerFn, d as fetchCardsLeaderboard, f as fetchCoinsLeaderboard, g as fetchGymsLeaderboard, x as fetchXpLeaderboard, y as fetchPokemonLeaderboard } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { r as UserAvatar, t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-xdzc_2IA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var METRICS = [
	{
		id: "xp",
		label: "XP",
		icon: Layers
	},
	{
		id: "coins",
		label: "Coins",
		icon: Coins
	},
	{
		id: "cards",
		label: "Cards",
		icon: PackageOpen
	},
	{
		id: "pokemon",
		label: "Pokémon",
		icon: Crown
	},
	{
		id: "gyms",
		label: "Gym Achievements",
		icon: Trophy
	}
];
function LeaderboardPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Leaderboards",
		subtitle: "Every ranking is pulled from the live trainer community.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeaderboardBody, {})
	});
}
function LeaderboardBody() {
	const { data: user } = useSession();
	const [metric, setMetric] = (0, import_react.useState)("xp");
	const fetchXP = useServerFn(fetchXpLeaderboard);
	const fetchCoins = useServerFn(fetchCoinsLeaderboard);
	const fetchCards = useServerFn(fetchCardsLeaderboard);
	const fetchPokemon = useServerFn(fetchPokemonLeaderboard);
	const fetchGyms = useServerFn(fetchGymsLeaderboard);
	const leaderboardFn = metric === "xp" ? fetchXP : metric === "coins" ? fetchCoins : metric === "cards" ? fetchCards : metric === "pokemon" ? fetchPokemon : fetchGyms;
	const boardQuery = useQuery({
		queryKey: [
			"aidoru",
			"leaderboard",
			metric
		],
		queryFn: () => leaderboardFn(),
		retry: false
	});
	if (!user) return null;
	const board = [...boardQuery.data ?? []].sort((left, right) => {
		const scoreDelta = Number(right.score) - Number(left.score);
		if (scoreDelta !== 0) return scoreDelta;
		return left.name.localeCompare(right.name);
	});
	const podium = board.slice(0, 3);
	const remaining = board.slice(3);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6 pb-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "leaderboard-shell",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hof-kicker",
						children: "Live community rankings"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "hof-heading mt-1 text-4xl tracking-tight sm:text-6xl",
						children: "Global Peeps"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "leaderboard-live-pill",
						children: [metric.toUpperCase(), " · LIVE"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "leaderboard-tabs mt-6",
					role: "tablist",
					"aria-label": "Leaderboard metric",
					children: METRICS.map(({ id, label, icon: Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-active": metric === id,
						onClick: () => setMetric(id),
						className: "leaderboard-tab",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" }),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })
						]
					}, id))
				}),
				boardQuery.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "Loading live rankings…"
				}),
				boardQuery.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "The leaderboard is unavailable until the shared database is reachable."
				}),
				!boardQuery.isLoading && !boardQuery.isError && board.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "No ranked trainers yet."
				}),
				board.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "leaderboard-podium mt-8",
					children: [
						podium[1],
						podium[0],
						podium[2]
					].map((row, index) => row && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PodiumCard, {
						row,
						place: row === podium[0] ? 1 : index === 0 ? 2 : 3
					}, row.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 space-y-3",
					children: remaining.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeaderboardRowCard, {
						row,
						rank: index + 4,
						current: row.id === user.id
					}, `${row.id}-${index}`))
				})] })
			]
		})
	});
}
function scoreText(row) {
	return formatCompactCoins(row.score);
}
function metricLabel(row) {
	if (row.scoreLabel === "BADGES") return `${row.score} badge${row.score === 1 ? "" : "s"}`;
	return `LV ${row.trainerLevel}`;
}
function PodiumCard({ row, place }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: 12
		},
		animate: {
			opacity: 1,
			y: 0
		},
		className: "leaderboard-podium-card",
		"data-place": place,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "leaderboard-place",
				children: place
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
				name: row.name,
				src: row.avatarUrl,
				videoSrc: row.avatarVideoUrl,
				className: "leaderboard-podium-avatar"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "leaderboard-podium-name",
				title: row.name,
				children: row.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "leaderboard-score",
				children: [
					scoreText(row),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.scoreLabel })
				]
			})
		]
	});
}
function LeaderboardRowCard({ row, rank, current }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `leaderboard-rank-row ${current ? "leaderboard-rank-row-current" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "leaderboard-rank",
				children: ["#", rank]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserAvatar, {
				name: row.name,
				src: row.avatarUrl,
				videoSrc: row.avatarVideoUrl,
				className: "leaderboard-rank-avatar"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "leaderboard-rank-name",
					title: row.name,
					children: row.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "leaderboard-rank-meta",
					children: [
						row.title,
						" · ",
						metricLabel(row)
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "leaderboard-rank-score",
				children: [
					scoreText(row),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.scoreLabel })
				]
			})
		]
	});
}
//#endregion
export { LeaderboardPage as component };
