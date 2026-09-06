import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react, r as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { a as HeadContent, c as createRouter, d as createFileRoute, f as createRootRouteWithContext, h as useRouter, i as Scripts, l as Outlet, p as Link, u as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as __exportAll } from "./server-B39CcLPg.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-t7obAA2Z.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
var styles_default = "/assets/styles-DeEDdaMv.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-background flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass max-w-md rounded-3xl p-10 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-gradient-brand text-7xl font-bold",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-foreground mt-4 text-xl font-semibold",
					children: "Off the map"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground mt-2 text-sm",
					children: "This zone doesn't exist in the trainer hub."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "bg-gradient-brand text-foreground glow-pink inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold",
						children: "Return to portal"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	const rawMessage = error instanceof Error ? error.message : "";
	const isBattleFailure = /battle room|battle|trainer|not signed in|database|mongodb/i.test(rawMessage);
	const displayTitle = isBattleFailure ? "Battle signal lost" : "Signal lost";
	const displayMessage = isBattleFailure ? rawMessage || "This battle room is unavailable. It may have expired or is waking up." : "Something went wrong on our end. Try again or head back to the portal.";
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-background flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass max-w-md rounded-3xl p-10 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-foreground font-display text-xl font-semibold tracking-tight",
					children: displayTitle
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground mt-2 text-sm",
					children: displayMessage
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "bg-gradient-brand text-foreground inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "border-border text-foreground hover:bg-accent/20 inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$11 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "aidoru community" },
			{
				name: "description",
				content: "aidoru community is an anime trainer hub for live profiles, cards, parties, the Mart, battles, guilds, and arcade games synced with your bot."
			},
			{
				name: "author",
				content: "AIDORU"
			},
			{
				property: "og:title",
				content: "aidoru community"
			},
			{
				property: "og:description",
				content: "aidoru community for live bot-synced profiles, cards, parties, battles, the Mart, guilds, and arcade games."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				property: "og:image",
				content: "https://3000-ic7215mrcwgizp01k32b0-b155e482.us3.manus.computer/manus-storage/8bc38a97.png"
			},
			{
				property: "og:image:alt",
				content: "AIDORU anime portal artwork"
			},
			{
				property: "og:image:type",
				content: "image/png"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:image",
				content: "https://3000-ic7215mrcwgizp01k32b0-b155e482.us3.manus.computer/manus-storage/8bc38a97.png"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.png",
				type: "image/png"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$11.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, { position: "top-center" })]
	});
}
var $$splitComponentImporter$10 = () => import("./routes-hn22ndz2.mjs");
var Route$10 = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "aidoru community" },
			{
				name: "description",
				content: "aidoru community is the anime-inspired portal for your bot trainer account."
			},
			{
				property: "og:title",
				content: "aidoru community"
			}
		],
		links: [{
			rel: "preload",
			href: "/page-previews/welcome.jpg",
			as: "image",
			type: "image/jpeg"
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./arcade-C9MVEGAO.mjs");
var Route$9 = createFileRoute("/arcade")({
	head: () => ({ meta: [{ title: "Arcade — AIDORU" }, {
		name: "description",
		content: "Play the same virtual-coin arcade games as the AIDORU bot."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./battle-D5-At1VY.mjs");
var Route$8 = createFileRoute("/battle")({
	head: () => ({ meta: [{ title: "Pokémon Battle — AIDORU" }, {
		name: "description",
		content: "Create a Pokémon battle room, join with a code, or watch an active arena."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./cards-osc0Wtdd.mjs");
var Route$7 = createFileRoute("/cards")({
	head: () => ({ meta: [{ title: "Card Vault — AIDORU" }, {
		name: "description",
		content: "View your live anime card collection and buy cards listed from the bot."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./dashboard-xdzc_2IA.mjs");
var Route$6 = createFileRoute("/dashboard")({
	head: () => ({ meta: [{ title: "Leaderboards — AIDORU" }, {
		name: "description",
		content: "Live AIDORU rankings with real bot usernames, avatars, and trainer statistics."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./guild-DNqmkqH3.mjs");
var Route$5 = createFileRoute("/guild")({
	head: () => ({ meta: [
		{ title: "Guilds · aidoru community" },
		{
			name: "description",
			content: "Build an anime guild, grow its level through bot work, manage its treasury, and meet upgrade requirements in aidoru community."
		},
		{
			property: "og:title",
			content: "Guilds · aidoru community"
		},
		{
			property: "og:description",
			content: "Anime guild progression, members, treasury, taxes, and upgrades synced with Kelin-MD2."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./journey-2X_LVtE3.mjs");
var Route$4 = createFileRoute("/journey")({
	head: () => ({ meta: [{ title: "Journey — AIDORU Pokémon party" }, {
		name: "description",
		content: "Manage the live Pokémon party and PC from your AIDORU trainer account."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./mart-DCwrdM1f.mjs");
var Route$3 = createFileRoute("/mart")({
	head: () => ({ meta: [{ title: "Shop — AIDORU" }, {
		name: "description",
		content: "Buy live Pokémon trainer items with your AIDORU wallet."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./pets-BGFAEbCv.mjs");
var Route$2 = createFileRoute("/pets")({
	head: () => ({ meta: [{ title: "Pet Lounge — AIDORU" }, {
		name: "description",
		content: "Feed, play with, hatch, and manage your live pets."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./profile-Cz5dIOsI.mjs");
var Route$1 = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: "My Profile — AIDORU" }, {
		name: "description",
		content: "Your live AIDORU trainer profile, Pokémon party, collection, and bag."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./battle._roomId-NSC1E3p8.mjs");
var Route = createFileRoute("/battle/$roomId")({
	head: () => ({ meta: [{ title: "Battle Room — AIDORU" }, {
		name: "description",
		content: "A live Pokémon battle room with moves, items, switching, and spectators."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$10.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$11
});
var ArcadeRoute = Route$9.update({
	id: "/arcade",
	path: "/arcade",
	getParentRoute: () => Route$11
});
var BattleRoute = Route$8.update({
	id: "/battle",
	path: "/battle",
	getParentRoute: () => Route$11
});
var CardsRoute = Route$7.update({
	id: "/cards",
	path: "/cards",
	getParentRoute: () => Route$11
});
var DashboardRoute = Route$6.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => Route$11
});
var GuildRoute = Route$5.update({
	id: "/guild",
	path: "/guild",
	getParentRoute: () => Route$11
});
var JourneyRoute = Route$4.update({
	id: "/journey",
	path: "/journey",
	getParentRoute: () => Route$11
});
var MartRoute = Route$3.update({
	id: "/mart",
	path: "/mart",
	getParentRoute: () => Route$11
});
var PetsRoute = Route$2.update({
	id: "/pets",
	path: "/pets",
	getParentRoute: () => Route$11
});
var ProfileRoute = Route$1.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$11
});
var BattleRouteChildren = { BattleRoomIdRoute: Route.update({
	id: "/$roomId",
	path: "/$roomId",
	getParentRoute: () => BattleRoute
}) };
var rootRouteChildren = {
	IndexRoute,
	ArcadeRoute,
	BattleRoute: BattleRoute._addFileChildren(BattleRouteChildren),
	CardsRoute,
	DashboardRoute,
	GuildRoute,
	JourneyRoute,
	MartRoute,
	PetsRoute,
	ProfileRoute
};
var routeTree = Route$11._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { Route as n, router_exports as t };
