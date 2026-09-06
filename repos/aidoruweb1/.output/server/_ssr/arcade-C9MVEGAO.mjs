import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { r as formatCoins } from "./game-qTZOZDmK.mjs";
import { K as Dice5, X as Coins, u as Sparkles } from "../_libs/lucide-react.mjs";
import { $ as useSession, A as placeBet, G as spinSlots, J as throwDice, Q as useServerFn, W as spinRoulette, et as useSessionWriter, w as flipCoin } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { t as confetti_module_default } from "../_libs/canvas-confetti.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/arcade-C9MVEGAO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ArcadePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Arcade & Odds",
		subtitle: "The same virtual-coin games, wager limits, and cooldowns as your bot account.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArcadeBody, {})
	});
}
function ArcadeBody() {
	const { data: user } = useSession();
	const writeSession = useSessionWriter();
	const [wager, setWager] = (0, import_react.useState)(250);
	const [reels, setReels] = (0, import_react.useState)([
		"🍒",
		"🍋",
		"💎"
	]);
	const [spinning, setSpinning] = (0, import_react.useState)(false);
	const [flip, setFlip] = (0, import_react.useState)("heads");
	const [flipResult, setFlipResult] = (0, import_react.useState)(null);
	const [diceGuess, setDiceGuess] = (0, import_react.useState)(3);
	const [rouletteColor, setRouletteColor] = (0, import_react.useState)("red");
	const doSpin = useServerFn(spinSlots);
	const doFlip = useServerFn(flipCoin);
	const doBet = useServerFn(placeBet);
	const doDice = useServerFn(throwDice);
	const doRoulette = useServerFn(spinRoulette);
	const spin = useMutation({
		mutationFn: () => doSpin({ data: { wager: Math.min(1e9, Math.max(50, wager)) } }),
		onMutate: () => setSpinning(true),
		onSuccess: (result) => {
			setTimeout(() => {
				setReels(result.reels);
				setSpinning(false);
				writeSession(result.user);
				if (result.delta > 0) {
					confetti_module_default({
						particleCount: 100,
						spread: 70,
						colors: ["#18e0e7", "#f8c84e"]
					});
					toast.success(`x${result.multiplier} payout · +${formatCoins(result.delta)} coins`);
				} else toast.error(`Slots result · ${formatCoins(Math.abs(result.delta))} coins`);
			}, 650);
		},
		onError: (error) => {
			setSpinning(false);
			toast.error(error.message);
		}
	});
	const coinFlip = useMutation({
		mutationFn: () => doFlip({ data: {
			wager: Math.min(1e9, Math.max(10, wager)),
			pick: flip
		} }),
		onSuccess: (result) => {
			setFlipResult(result.result);
			writeSession(result.user);
			if (result.won) {
				confetti_module_default({
					particleCount: 80,
					spread: 60,
					colors: ["#18e0e7", "#d8f7ff"]
				});
				toast.success(`${result.result} · +${formatCoins(result.delta)} coins`);
			} else toast.error(`${result.result} · ${formatCoins(Math.abs(result.delta))} coins`);
		},
		onError: (error) => toast.error(error.message)
	});
	const bet = useMutation({
		mutationFn: () => doBet({ data: { wager: Math.min(1e9, Math.max(10, wager)) } }),
		onSuccess: (result) => {
			writeSession(result.user);
			result.won ? toast.success(`Lucky bet · +${formatCoins(result.delta)} coins`) : toast.error(`Bet lost · ${formatCoins(Math.abs(result.delta))} coins`);
		},
		onError: (error) => toast.error(error.message)
	});
	const dice = useMutation({
		mutationFn: () => doDice({ data: {
			wager: Math.min(5e8, Math.max(50, wager)),
			guess: diceGuess
		} }),
		onSuccess: (result) => {
			writeSession(result.user);
			if (result.won) {
				confetti_module_default({
					particleCount: 100,
					spread: 70
				});
				toast.success(`Dice landed ${result.roll} · +${formatCoins(result.delta)} coins`);
			} else toast.error(`Dice landed ${result.roll} · ${formatCoins(Math.abs(result.delta))} coins`);
		},
		onError: (error) => toast.error(error.message)
	});
	const roulette = useMutation({
		mutationFn: () => doRoulette({ data: {
			wager: Math.min(1e9, Math.max(100, wager)),
			color: rouletteColor
		} }),
		onSuccess: (result) => {
			writeSession(result.user);
			if (result.won) {
				confetti_module_default({
					particleCount: 100,
					spread: 70
				});
				toast.success(`Roulette landed ${result.roll} (${result.rollColor}) · +${formatCoins(result.delta)} coins`);
			} else toast.error(`Roulette landed ${result.roll} (${result.rollColor}) · ${formatCoins(Math.abs(result.delta))} coins`);
		},
		onError: (error) => toast.error(error.message)
	});
	if (!user) return null;
	const maxWager = Math.max(50, Math.min(1e9, user.coins || 50));
	const safeWager = Math.min(wager, maxWager);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 pb-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hof-panel flex flex-wrap items-center gap-4 p-5 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-52 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Virtual coin wager"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "hof-heading mt-1 text-3xl",
								children: [formatCoins(safeWager), " coins"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: "Lucky bet: up to 1,000,000,000 coins"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 10,
						max: maxWager,
						step: 100,
						value: safeWager,
						onChange: (event) => setWager(Number(event.target.value)),
						className: "w-full accent-cyan-300 sm:max-w-md"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							1e3,
							1e5,
							1e6,
							1e7,
							1e8,
							1e9
						].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setWager(Math.min(value, maxWager)),
							className: "hof-tab px-3 py-2 font-mono-ui text-[10px]",
							children: formatCoins(Math.min(value, maxWager))
						}, value))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 lg:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hof-panel p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Bot-matched game"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Slots"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Weighted reels with the same payout table as the bot. Slots accept wagers up to 50,000."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6 grid grid-cols-3 gap-3",
								children: reels.map((symbol, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
									animate: spinning ? {
										y: [
											0,
											-14,
											0
										],
										opacity: [
											1,
											.35,
											1
										]
									} : {
										y: 0,
										opacity: 1
									},
									transition: {
										duration: .3,
										repeat: spinning ? Infinity : 0
									},
									className: "hof-image grid aspect-square place-items-center rounded-2xl text-4xl",
									children: symbol
								}, `${symbol}-${index}`))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => spin.mutate(),
								disabled: spin.isPending || spinning,
								className: "hof-button mt-6 w-full",
								children: spinning ? "Spinning…" : "Spin slots"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hof-panel p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Bot-matched game"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Coinflip"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Choose a side, then risk your wallet coins. Coinflip accepts wagers up to 100,000."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8 flex justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
									animate: { rotateY: flipResult ? 720 : 0 },
									transition: { duration: .8 },
									className: "grid size-28 place-items-center rounded-full border border-cyan-300/50 bg-cyan-300/10 text-cyan-200",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "size-12" })
								}, flipResult ?? "idle")
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-center font-mono-ui text-[10px] tracking-[0.2em] text-muted-foreground uppercase",
								children: flipResult ? `Landed ${flipResult}` : "Awaiting toss"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 grid grid-cols-2 gap-2",
								children: ["heads", "tails"].map((side) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setFlip(side),
									className: `hof-tab px-3 py-3 font-display text-lg ${flip === side ? "is-active" : ""}`,
									children: side
								}, side))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => coinFlip.mutate(),
								disabled: coinFlip.isPending,
								className: "hof-button mt-4 w-full",
								children: coinFlip.isPending ? "Tossing…" : "Toss coin"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hof-panel p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Risk / reward"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Lucky bet"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "A short-cooldown wager using your live bot wallet, with a 1,000,000,000-coin virtual cap."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8 grid place-items-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid size-28 place-items-center rounded-full border border-amber-300/50 bg-amber-300/10 text-amber-200",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dice5, { className: "size-12" })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-5 text-center font-mono-ui text-[10px] tracking-[0.18em] text-muted-foreground uppercase",
								children: "53% virtual-coin chance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => bet.mutate(),
								disabled: bet.isPending,
								className: "hof-button mt-10 w-full",
								children: bet.isPending ? "Rolling…" : "Place bet"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hof-panel p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Bot-matched game"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Dice"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Guess the dice roll (1-6) to win 5x your wager. Max wager: 500,000,000."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 grid grid-cols-3 gap-2",
								children: [
									1,
									2,
									3,
									4,
									5,
									6
								].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setDiceGuess(n),
									className: `hof-tab py-2 font-display text-lg ${diceGuess === n ? "is-active" : ""}`,
									children: n
								}, n))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => dice.mutate(),
								disabled: dice.isPending,
								className: "hof-button mt-6 w-full",
								children: dice.isPending ? "Rolling…" : "Throw Dice"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hof-panel p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hof-kicker",
								children: "Bot-matched game"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "hof-heading mt-1 text-3xl",
								children: "Roulette"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: "Bet on Red (2x), Black (2x), or Green (14x). Max wager: 1,000,000,000."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 grid grid-cols-3 gap-2",
								children: [
									"red",
									"black",
									"green"
								].map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setRouletteColor(color),
									className: `hof-tab py-2 font-display text-xs uppercase ${rouletteColor === color ? "is-active" : ""}`,
									style: { borderColor: color === "green" ? "#10b981" : color === "red" ? "#ef4444" : "#334155" },
									children: color
								}, color))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => roulette.mutate(),
								disabled: roulette.isPending,
								className: "hof-button mt-6 w-full",
								children: roulette.isPending ? "Spinning…" : "Spin Roulette"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hof-panel flex gap-3 p-5 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mt-0.5 size-5 shrink-0 text-cyan-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "These are in-game coins only. There is no cash deposit, cash-out, or real-money wagering. Your balance is the same wallet used by AIDORU in WhatsApp." })]
			})
		]
	});
}
//#endregion
export { ArcadePage as component };
