import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { D as LoaderCircle, S as Package, V as Eye, W as DoorOpen, Y as Copy, _ as RotateCcw, c as Swords, et as Check, m as Share2, u as Sparkles, y as Radio, z as Flame } from "../_libs/lucide-react.mjs";
import { Q as useServerFn, c as fetchBattleRoom, n as applyBattleAction } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { t as AppShell } from "./AppShell-BjZxzV-O.mjs";
import { n as Route } from "./router-t7obAA2Z.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/battle._roomId-NSC1E3p8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BattleRoomPage() {
	const { roomId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Pokémon Battle",
		subtitle: "Enter the arena, ready your party, or spectate the live battle.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleRoomBody, { roomId })
	});
}
function BattleRoomBody({ roomId }) {
	const queryClient = useQueryClient();
	const loadRoom = useServerFn(fetchBattleRoom);
	const act = useServerFn(applyBattleAction);
	const query = useQuery({
		queryKey: [
			"aidoru",
			"battle-room",
			roomId
		],
		queryFn: () => loadRoom({ data: { roomId } }),
		refetchInterval: 1400,
		retry: false
	});
	const mutation = useMutation({
		mutationFn: (action) => act({ data: {
			roomId,
			action
		} }),
		onSuccess: (room) => queryClient.setQueryData([
			"aidoru",
			"battle-room",
			roomId
		], room)
	});
	const [flash, setFlash] = (0, import_react.useState)(null);
	const [spectatorView, setSpectatorView] = (0, import_react.useState)("challenger");
	const redirectedToLogin = (0, import_react.useRef)(false);
	const room = query.data;
	(0, import_react.useEffect)(() => {
		const message = query.error instanceof Error ? query.error.message : "";
		if (!query.isError || redirectedToLogin.current || !/^not signed in\.$/i.test(message)) return;
		redirectedToLogin.current = true;
		const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		window.location.assign(`/?returnTo=${encodeURIComponent(returnTo)}`);
	}, [query.error, query.isError]);
	if (query.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomState, {
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-7 animate-spin" }),
		text: "Loading battle room…"
	});
	if (query.isError || !room) {
		const message = query.error instanceof Error ? query.error.message : "Battle room unavailable.";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoomState, {
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DoorOpen, { className: "size-7" }),
			text: message === "Not signed in." ? "Opening the trainer portal so you can sign in and return to this battle…" : message
		});
	}
	const perform = (action) => {
		setFlash(null);
		mutation.mutate(action, { onError: (error) => setFlash(error instanceof Error ? error.message : "That battle action failed.") });
	};
	room.status;
	const isSpectator = room.joinedAs === "spectator";
	const me = room.joinedAs === "challenger" ? room.challenger : room.opponent;
	const foe = room.joinedAs === "challenger" ? room.opponent : room.challenger;
	const viewedMe = isSpectator ? spectatorView === "challenger" ? room.challenger : room.opponent : me;
	const viewedFoe = isSpectator ? spectatorView === "challenger" ? room.opponent : room.challenger : foe;
	const waitingForOpponent = !room.opponent;
	const waitingForReady = Boolean(room.opponent && room.status === "waiting");
	const forcedSwitch = room.forcedSwitch === room.joinedAs;
	const myTurn = room.turn === room.joinedAs;
	const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/battle?room=${encodeURIComponent(room.code)}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "aidoru-page aidoru-page-battle-room space-y-5 pb-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleMusic, { status: room.status }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleEndSound, {
				status: room.status,
				winnerId: room.winnerId,
				playerId: me?.id ?? null
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "battle-room-toolbar hof-panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-live-dot" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "hof-kicker",
						children: ["Room ", room.code]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold",
						children: room.status === "active" ? "Live combat" : room.status === "finished" ? "Battle complete" : "Waiting room"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleSoundscape, {
							combatLog: room.combatLog,
							status: room.status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void navigator.clipboard?.writeText(shareUrl).then(() => setFlash("Battle link copied.")),
							className: "hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3" }), "Share room"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "/battle",
							className: "hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-3" }), "All rooms"]
						})
					]
				})]
			}),
			waitingForOpponent && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaitingRoomCard, { room }),
			isSpectator && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "battle-spectator-banner",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "size-5 text-cyan-200" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg font-bold text-cyan-100",
						children: "Spectate mode"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-slate-300",
						children: "You are watching this room read-only. Trainers keep control of their Pokémon."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSpectatorView((side) => side === "challenger" ? "opponent" : "challenger"),
						className: "hof-button-secondary ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3" }),
							"View ",
							spectatorView === "challenger" ? "opponent" : "challenger"
						]
					})
				]
			}),
			waitingForReady && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "battle-ready-banner hof-panel p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hof-kicker",
						children: "Both parties loaded"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "hof-heading mt-1 text-3xl",
						children: "Ready when you are."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-slate-300",
						children: "The room is shared. Each trainer must press ready before the first lead Pokémon is sent out."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => perform({ type: "ready" }),
						disabled: mutation.isPending || me?.ready,
						className: "hof-button mt-4 inline-flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), me?.ready ? "Ready" : "Ready up"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleArena, {
				room,
				me: viewedMe,
				foe: viewedFoe,
				myTurn,
				forcedSwitch,
				isSpectator,
				mutationPending: mutation.isPending,
				onAction: perform
			}),
			flash && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100",
				children: flash
			})
		]
	});
}
function WaitingRoomCard({ room }) {
	const [copied, setCopied] = (0, import_react.useState)(null);
	const roomUrl = `${typeof window === "undefined" ? "" : window.location.origin}/battle?room=${encodeURIComponent(room.code)}`;
	const copy = (value, kind) => {
		const clipboard = navigator.clipboard;
		if (!clipboard) return;
		clipboard.writeText(value).then(() => {
			setCopied(kind);
			window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1600);
		});
	};
	const share = () => {
		if (navigator.share) {
			navigator.share({
				title: "AIDORU Pokémon Battle",
				text: `Join my Pokémon battle with code ${room.code}.`,
				url: roomUrl
			}).catch(() => void 0);
			return;
		}
		copy(roomUrl, "link");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "battle-waiting-card hof-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-waiting-heading",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hof-kicker",
					children: "Room ready"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "battle-panel-title",
					children: "Waiting for trainer"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "battle-waiting-status",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-waiting-dot" }), "Open"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm leading-6 text-slate-300",
				children: "Share this code or link. The first signed-in trainer who opens it joins automatically."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-code-box",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "hof-kicker",
						children: "Room code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "battle-code-value",
						children: room.code
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "battle-code-url",
						children: roomUrl
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-waiting-actions",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => copy(room.code, "code"),
					className: "battle-secondary-button",
					children: copied === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), "Copied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-4" }), "Copy code"] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: share,
					className: "battle-primary-button",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "size-4" }), copied === "link" ? "Link copied" : "Share room"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: "/battle",
				className: "battle-back-link",
				children: "Return to battle lobby"
			})
		]
	});
}
function BattleSoundscape({ combatLog, status }) {
	const [enabled, setEnabled] = (0, import_react.useState)(false);
	const audioRef = (0, import_react.useRef)(null);
	const previousLength = (0, import_react.useRef)(combatLog.length);
	const context = () => {
		if (typeof window === "undefined") return null;
		const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextCtor) return null;
		audioRef.current ??= new AudioContextCtor();
		audioRef.current.resume();
		return audioRef.current;
	};
	const tone = (frequency, duration, type = "sine", volume = .035) => {
		const ctx = context();
		if (!ctx) return;
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = type;
		oscillator.frequency.value = frequency;
		gain.gain.setValueAtTime(volume, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
		oscillator.connect(gain).connect(ctx.destination);
		oscillator.start();
		oscillator.stop(ctx.currentTime + duration);
	};
	(0, import_react.useEffect)(() => {
		if (!enabled) {
			previousLength.current = combatLog.length;
			return;
		}
		const latest = combatLog[combatLog.length - 1] ?? "";
		if (combatLog.length > previousLength.current) {
			if (/fainted/i.test(latest)) {
				tone(180, .24, "sawtooth", .06);
				window.setTimeout(() => tone(110, .35, "triangle", .045), 100);
			} else if (/wins|victory|complete/i.test(latest) || status === "finished") {
				tone(523, .18, "triangle");
				window.setTimeout(() => tone(659, .24, "triangle"), 130);
			} else if (/hit|damage|used|attacked|sent out/i.test(latest)) tone(260, .08, "square", .025);
			previousLength.current = combatLog.length;
		}
	}, [
		combatLog,
		enabled,
		status
	]);
	(0, import_react.useEffect)(() => {
		if (!enabled) return;
		const ctx = context();
		if (!ctx) return;
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = 98;
		gain.gain.value = .006;
		oscillator.connect(gain).connect(ctx.destination);
		oscillator.start();
		const pulse = window.setInterval(() => {
			oscillator.frequency.setTargetAtTime(98 + Math.random() * 16, ctx.currentTime, .8);
		}, 1800);
		return () => {
			window.clearInterval(pulse);
			oscillator.stop();
			oscillator.disconnect();
			gain.disconnect();
		};
	}, [enabled]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => setEnabled((value) => !value),
		className: "hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs",
		"aria-pressed": enabled,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: `size-3 ${enabled ? "text-cyan-200" : ""}` }), enabled ? "Sound on" : "Sound"]
	});
}
var battleMusicTracks = [
	"mus_vs_trainer",
	"mus_vs_wild",
	"mus_vs_gym_leader",
	"mus_vs_champion"
];
var victoryTracks = [
	"mus_victory_trainer",
	"mus_victory_gym_leader",
	"mus_victory_road"
];
var defeatTracks = [
	"mus_too_bad",
	"se_failure",
	"se_faint"
];
function BattleMusic({ status }) {
	const audioRef = (0, import_react.useRef)(null);
	const [track] = (0, import_react.useState)(() => battleMusicTracks[Math.floor(Math.random() * battleMusicTracks.length)]);
	const [enabled, setEnabled] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const active = enabled && status !== "finished";
		audio.volume = .22;
		audio.loop = true;
		audio.preload = "auto";
		const resume = () => {
			if (active && audio.paused) audio.play().catch(() => void 0);
		};
		const watchdog = window.setInterval(resume, 1500);
		if (active) resume();
		else audio.pause();
		window.addEventListener("pointerdown", resume);
		window.addEventListener("touchstart", resume, { passive: true });
		window.addEventListener("keydown", resume);
		window.addEventListener("visibilitychange", resume);
		window.addEventListener("pageshow", resume);
		audio.addEventListener("ended", resume);
		audio.addEventListener("pause", resume);
		audio.addEventListener("canplay", resume);
		return () => {
			window.clearInterval(watchdog);
			window.removeEventListener("pointerdown", resume);
			window.removeEventListener("touchstart", resume);
			window.removeEventListener("keydown", resume);
			window.removeEventListener("visibilitychange", resume);
			window.removeEventListener("pageshow", resume);
			audio.removeEventListener("ended", resume);
			audio.removeEventListener("pause", resume);
			audio.removeEventListener("canplay", resume);
			audio.pause();
		};
	}, [enabled, status]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-music-control",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
			ref: audioRef,
			src: `/battle-music/${track}.mp3`,
			loop: true,
			autoPlay: true,
			preload: "auto"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs",
			onClick: () => setEnabled((value) => !value),
			"aria-pressed": enabled,
			children: enabled ? "Music on" : "Music off"
		})]
	});
}
function BattleEndSound({ status, winnerId, playerId }) {
	const playedKey = (0, import_react.useRef)(null);
	const [track] = (0, import_react.useState)(() => ({
		victory: victoryTracks[Math.floor(Math.random() * victoryTracks.length)],
		defeat: defeatTracks[Math.floor(Math.random() * defeatTracks.length)]
	}));
	const result = Boolean(winnerId && playerId && winnerId === playerId) ? "victory" : "defeat";
	(0, import_react.useEffect)(() => {
		if (status !== "finished" || !playerId || playedKey.current === `${winnerId}:${playerId}`) return;
		playedKey.current = `${winnerId}:${playerId}`;
		const audio = new Audio(`/battle-music/${track[result]}.mp3`);
		audio.volume = .46;
		audio.play().catch(() => void 0);
		return () => {
			audio.pause();
			audio.currentTime = 0;
		};
	}, [
		playerId,
		result,
		status,
		track,
		winnerId
	]);
	return null;
}
function BattleArena({ room, me, foe, myTurn, forcedSwitch, isSpectator, mutationPending, onAction }) {
	const activeMe = me?.party[me.activeIndex] ?? null;
	const activeFoe = foe?.party[foe.activeIndex] ?? null;
	const [tab, setTab] = (0, import_react.useState)("moves");
	const [recallSide, setRecallSide] = (0, import_react.useState)(null);
	const [sendOutSide, setSendOutSide] = (0, import_react.useState)(null);
	const [damageSide, setDamageSide] = (0, import_react.useState)(null);
	const [damageAmount, setDamageAmount] = (0, import_react.useState)(null);
	const [damageId, setDamageId] = (0, import_react.useState)(0);
	const previousHp = (0, import_react.useRef)({
		me: activeMe?.hp ?? null,
		foe: activeFoe?.hp ?? null
	});
	const previousActiveIds = (0, import_react.useRef)({
		me: activeMe?.id ?? null,
		foe: activeFoe?.id ?? null
	});
	(0, import_react.useEffect)(() => {
		const next = {
			me: activeMe?.hp ?? null,
			foe: activeFoe?.hp ?? null
		};
		const faintedSide = previousHp.current.me !== null && previousHp.current.me > 0 && next.me !== null && next.me <= 0 ? "me" : previousHp.current.foe !== null && previousHp.current.foe > 0 && next.foe !== null && next.foe <= 0 ? "foe" : null;
		const hitSide = previousHp.current.me !== null && next.me !== null && next.me < previousHp.current.me ? "me" : previousHp.current.foe !== null && next.foe !== null && next.foe < previousHp.current.foe ? "foe" : null;
		previousHp.current = next;
		if (hitSide) {
			const pkmn = hitSide === "me" ? activeMe : activeFoe;
			const cryUrl = pkmn ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/cries/${pkmn.pokedexId}.ogg` : null;
			const sound = new Audio(faintedSide ? "/battle-music/se_faint.mp3" : cryUrl || "/battle-music/se_ball_throw.mp3");
			sound.volume = faintedSide ? .5 : .28;
			sound.play().catch(() => void 0);
		}
		if (!faintedSide) return;
		setRecallSide(faintedSide);
		const timer = window.setTimeout(() => setRecallSide((side) => side === faintedSide ? null : side), 1150);
		return () => window.clearTimeout(timer);
	}, [activeMe?.hp, activeFoe?.hp]);
	(0, import_react.useEffect)(() => {
		const next = {
			me: activeMe?.id ?? null,
			foe: activeFoe?.id ?? null
		};
		const changedSide = previousActiveIds.current.me && next.me && previousActiveIds.current.me !== next.me ? "me" : previousActiveIds.current.foe && next.foe && previousActiveIds.current.foe !== next.foe ? "foe" : null;
		previousActiveIds.current = next;
		if (!changedSide) return;
		setSendOutSide(changedSide);
		const timer = window.setTimeout(() => setSendOutSide((side) => side === changedSide ? null : side), 1050);
		return () => window.clearTimeout(timer);
	}, [activeMe?.id, activeFoe?.id]);
	const [transitionId, setTransitionId] = (0, import_react.useState)(0);
	const [superEffectiveId, setSuperEffectiveId] = (0, import_react.useState)(0);
	const [superEffectiveActive, setSuperEffectiveActive] = (0, import_react.useState)(false);
	const previousLogLength = (0, import_react.useRef)(room.combatLog.length);
	(0, import_react.useEffect)(() => {
		if (room.combatLog.length <= previousLogLength.current) return;
		setTransitionId((value) => value + 1);
		const latest = room.combatLog[room.combatLog.length - 1] ?? "";
		previousLogLength.current = room.combatLog.length;
		const damagedSide = activeMe && latest.includes(`${activeMe.displayName} used`) ? "foe" : activeFoe && latest.includes(`${activeFoe.displayName} used`) ? "me" : null;
		const damageMatch = latest.match(/(\d+) damage/i);
		if (damagedSide && damageMatch) {
			setDamageSide(damagedSide);
			setDamageAmount(Number(damageMatch[1]));
			setDamageId((value) => value + 1);
			window.setTimeout(() => {
				setDamageSide((side) => side === damagedSide ? null : side);
				setDamageAmount((amount) => amount === Number(damageMatch[1]) ? null : amount);
			}, 950);
		}
		if (!/super effective!/i.test(latest)) return;
		setSuperEffectiveId((value) => value + 1);
		setSuperEffectiveActive(true);
		const timer = window.setTimeout(() => setSuperEffectiveActive(false), 900);
		return () => window.clearTimeout(timer);
	}, [room.combatLog.length, room.combatLog]);
	const winnerName = room.winnerId === room.challenger.id ? room.challenger.name : room.winnerId === room.opponent?.id ? room.opponent.name : null;
	const statusText = room.status === "finished" ? winnerName ? `${winnerName} has won the battle!` : "Battle complete" : room.status === "waiting" ? room.opponent ? "Both trainers loaded" : "Waiting for opponent" : forcedSwitch ? "Choose a replacement Pokémon" : myTurn ? "Your turn" : isSpectator ? "Spectating live battle" : "Opponent’s turn";
	const canAct = !isSpectator && !mutationPending && room.status === "active" && (myTurn || forcedSwitch);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: `battle-arena hof-panel overflow-hidden ${room.gym ? `battle-gym-theme-${room.gym.theme}` : ""}`,
		style: room.gym ? {
			"--gym-accent": room.gym.accent,
			"--gym-bg": `url("${room.gym.background}")`
		} : void 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-arena-top flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swords, { className: "size-4 text-cyan-200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-display text-lg font-bold",
						children: [
							room.challenger.name,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-cyan-300",
								children: "vs"
							}),
							" ",
							room.opponent?.name ?? "Waiting"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "battle-turn-label",
						children: statusText
					}), room.gym && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold text-white",
						children: [
							room.gym.badge,
							" · ",
							room.gym.rewardCoins.toLocaleString(),
							" coins"
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-message-strip",
				role: "status",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-message-dot" }), room.combatLog[room.combatLog.length - 1] ?? "The Pokémon match is ready."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `battle-field ${room.gym ? `battle-gym-field battle-gym-field-${room.gym.theme}` : ""} ${transitionId > 0 ? "battle-field-pulse" : ""} ${superEffectiveActive ? "battle-field-super-effective" : ""} ${myTurn ? "battle-field-my-turn" : ""} ${room.status === "finished" ? "battle-field-finished" : ""}`,
				style: room.gym ? { "--gym-accent": room.gym.accent } : void 0,
				children: [
					superEffectiveActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperEffectiveBurst, {}, superEffectiveId),
					activeFoe && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattlePokemonSprite, {
						pokemon: activeFoe,
						side: "foe",
						defeated: activeFoe.hp <= 0,
						hit: damageSide === "foe",
						sendOut: sendOutSide === "foe"
					}, `foe-${activeFoe.id}`),
					activeMe && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattlePokemonSprite, {
						pokemon: activeMe,
						side: "me",
						defeated: activeMe.hp <= 0,
						hit: damageSide === "me",
						sendOut: sendOutSide === "me"
					}, `me-${activeMe.id}`),
					recallSide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `battle-pokeball-recall battle-pokeball-recall-${recallSide}`,
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "battle-platform platform-foe" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "battle-platform platform-me" }),
					damageSide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleDamageBurst, {
						side: damageSide,
						amount: damageAmount
					}, damageId),
					sendOutSide && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `battle-pokeball-sendout battle-pokeball-sendout-${sendOutSide}`,
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleHud, {
						pokemon: activeFoe,
						trainer: foe,
						side: "foe"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleHud, {
						pokemon: activeMe,
						trainer: me,
						side: "me"
					}),
					transitionId > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleParticleTransition, {}, transitionId)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-controls border-t border-white/10 bg-black/25 p-4 sm:p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hof-kicker",
							children: room.gym ? `${room.gym.name} · Leader ${room.gym.leader}` : "Command console"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-slate-300",
							children: forcedSwitch ? "Your active Pokémon fainted. Send out a healthy teammate." : "Select a move or switch your active Pokémon."
						})] }), !isSpectator && room.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onAction({ type: "forfeit" }),
							disabled: mutationPending,
							className: "text-xs text-rose-200/75 underline underline-offset-4",
							children: "Forfeit"
						})]
					}),
					room.status === "waiting" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "battle-spectator-note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-4 text-cyan-200" }), room.opponent ? "Both Pokémon parties are loaded. Ready up or wait for the match to start." : "This Pokémon arena is open. Share the room link with the opposing trainer to load their party."]
					}),
					!isSpectator && room.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-4 flex gap-2 overflow-x-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
								active: tab === "moves",
								onClick: () => setTab("moves"),
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "size-4" }),
								children: "Moves"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
								active: tab === "items",
								onClick: () => setTab("items"),
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "size-4" }),
								children: "Items"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabButton, {
								active: tab === "switch",
								onClick: () => setTab("switch"),
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }),
								children: "Switch"
							})
						]
					}),
					isSpectator && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "battle-spectator-note",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-4 text-cyan-200" }), "Spectator mode is read-only. Share the room URL with another trainer to fill the next seat."]
					}),
					!isSpectator && tab === "moves" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
						children: activeMe?.moves.map((move, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => onAction({
								type: "move",
								moveIndex: index
							}),
							disabled: !canAct || forcedSwitch,
							className: "battle-move-button",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-base font-bold",
								children: move.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 text-[10px] uppercase tracking-[0.15em] text-cyan-200/70",
								children: [
									move.type,
									" · ",
									move.power || "status"
								]
							})]
						}, `${move.name}-${index}`))
					}),
					!isSpectator && tab === "items" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-amber-200/20 bg-amber-300/10 p-5 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-base font-bold text-amber-100",
							children: "Healing items are disabled during battles"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs leading-5 text-slate-300",
							children: "Switch to another healthy Pokémon during combat. Use healing items only after the battle ends."
						})]
					}),
					!isSpectator && tab === "switch" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
						children: me?.party.map((pokemon, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchButton, {
							pokemon,
							active: index === me.activeIndex,
							disabled: !canAct || pokemon.hp <= 0 || !forcedSwitch && index === me.activeIndex,
							onClick: () => onAction({
								type: "switch",
								pokemonIndex: index
							})
						}, pokemon.id))
					})
				]
			}),
			room.status === "finished" && winnerName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "battle-winner-banner",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [winnerName, " has won the battle!"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "size-5" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 border-t border-white/10 bg-[#061019]/85 p-4 sm:grid-cols-[1fr_1.35fr] sm:p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hof-kicker",
					children: "Battle log"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "battle-log mt-2",
					children: room.combatLog.slice().reverse().map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: index === 0 ? "text-cyan-100" : "",
						children: line
					}, `${line}-${index}`))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hof-kicker",
					children: "Party status"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6",
					children: Array.from({ length: 6 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PartyDot, {
						pokemon: me?.party[index] ?? null,
						active: index === me?.activeIndex
					}, me?.party[index]?.id ?? `empty-${index}`))
				})] })]
			})
		]
	});
}
function SuperEffectiveBurst() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-super-effective-burst",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SUPER EFFECTIVE!" }), Array.from({ length: 28 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { ["--super-index"]: index } }, index))]
	});
}
function BattleParticleTransition() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "battle-particle-transition",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-transition-ring" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-transition-ring" }),
			Array.from({ length: 12 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { ["--burst-index"]: index } }, index))
		]
	});
}
function BattlePokemonSprite({ pokemon, side, defeated, hit, sendOut }) {
	const sources = animatedPokemonUrls(pokemon, side);
	const [sourceIndex, setSourceIndex] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => setSourceIndex(0), [
		pokemon.id,
		pokemon.pokedexId,
		pokemon.name,
		pokemon.shiny,
		side
	]);
	const source = sources[Math.min(sourceIndex, sources.length - 1)] ?? pokemon[side === "me" ? "backSpriteUrl" : "frontSpriteUrl"];
	const scaleClass = battlePokemonScaleClass(pokemon);
	const isBackSprite = source.includes("/back/");
	const shouldFlip = side === "me" ? !isBackSprite : isBackSprite;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `battle-pokemon battle-pokemon-${side} ${scaleClass} ${defeated ? "battle-pokemon-fainted" : ""} ${hit ? "battle-pokemon-hit" : ""} ${sendOut ? "battle-pokemon-sendout" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: source,
			alt: pokemon.displayName,
			loading: "eager",
			decoding: "async",
			style: { transform: shouldFlip ? "scaleX(-1)" : "scaleX(1)" },
			fetchPriority: sourceIndex === 0 ? "high" : "auto",
			onError: (event) => {
				setSourceIndex((index) => {
					if (index < sources.length - 1) return index + 1;
					event.currentTarget.style.visibility = "hidden";
					return index;
				});
			}
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-pokemon-shadow" })]
	});
}
function battlePokemonScaleClass(pokemon) {
	const id = Number(pokemon.pokedexId);
	const name = `${pokemon.name} ${pokemon.displayName}`.toLowerCase();
	if ([
		382,
		383,
		384,
		493,
		483,
		484,
		487,
		643,
		644,
		646,
		717,
		718,
		791,
		792,
		800,
		888,
		889,
		890
	].includes(id) || /arceus|rayquaza|groudon|kyogre|lugia|ho[- ]oh|giratina|eternatus|zygarde|xerneas|yveltal|solgaleo|lunala|necrozma|zacian|zamazenta|reshiram|zekrom/i.test(name)) return /rayquaza|eternatus|zygarde|kyogre|groudon/i.test(name) || [
		382,
		383,
		384,
		890
	].includes(id) ? "battle-pokemon-huge-wide" : "battle-pokemon-huge";
	if ([
		6,
		149,
		248,
		373,
		376,
		445,
		635,
		706
	].includes(id) || /charizard|dragonite|tyranitar|salamence|metagross|garchomp|hydreigon|goodra/i.test(name)) return "battle-pokemon-large";
	if ([
		7,
		25,
		133,
		152,
		155,
		447,
		656,
		810,
		813,
		816
	].includes(id) || /sobble|froakie|pikachu|eevee|scorbunny|grookey|rowlet|rattata/i.test(name)) return "battle-pokemon-small";
	return "battle-pokemon-standard";
}
function animatedPokemonUrls(pokemon, side = "foe") {
	const id = Math.max(1, Math.floor(Number(pokemon.pokedexId) || 1));
	const baseName = String(pokemon.name || pokemon.displayName || "pokemon").trim().replace(/[- ]+(gigantamax|gmax)$/i, "").replace(/_+(gigantamax|gmax)$/i, "");
	const titleCase = baseName ? `${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}` : "Pokemon";
	const shinySuffix = pokemon.shiny ? "_Shiny" : "";
	const generationEight = Array.from(/* @__PURE__ */ new Set([
		`${pokemon.name}${shinySuffix}`,
		`${titleCase}${shinySuffix}`,
		`${titleCase}_Gigantamax${shinySuffix}`,
		`${titleCase}_Gmax${shinySuffix}`
	])).map((name) => `https://raw.githubusercontent.com/kelin132/gmax-gifs/master/Generation%208/${encodeURIComponent(name)}.gif`);
	const local = id <= 500 ? `/pokemon-gifs/${id}.gif` : "";
	const repositoryFront = `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/${id}.gif`;
	const repositoryBack = `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/back/${id}.gif`;
	const showdownFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
	const showdownBack = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${id}.gif`;
	const animatedBwFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
	const animatedBwBack = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${id}.gif`;
	const preferredSideSprite = side === "me" ? pokemon.backSpriteUrl : pokemon.frontSpriteUrl;
	const animatedStoredSprite = /^https?:\/\/.*\.gif(?:\?.*)?$/i.test(preferredSideSprite) ? preferredSideSprite : "";
	const animatedCandidates = side === "me" ? [
		repositoryBack,
		showdownBack,
		animatedBwBack,
		animatedStoredSprite,
		repositoryFront,
		local
	] : [
		...pokemon.pokedexId >= 810 && pokemon.pokedexId <= 905 ? generationEight : [],
		repositoryFront,
		showdownFront,
		animatedBwFront,
		animatedStoredSprite,
		local
	];
	return [...new Set(animatedCandidates.filter(Boolean))];
}
function BattleDamageBurst({ side, amount }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `battle-impact battle-impact-${side}`,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "battle-impact-core" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
				className: "battle-damage-label",
				children: ["-", amount ?? ""]
			}),
			Array.from({ length: 10 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { ["--impact-index"]: index } }, index))
		]
	});
}
function BattleHud({ pokemon, trainer, side }) {
	if (!pokemon) return null;
	const hp = Math.max(0, Math.min(100, pokemon.maxHp ? pokemon.hp / pokemon.maxHp * 100 : 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `battle-hud battle-hud-${side}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate font-display text-lg font-bold",
					children: pokemon.displayName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono-ui text-[10px] text-slate-300",
					children: ["Lv. ", pokemon.level]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 h-2 overflow-hidden rounded-full bg-black/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `h-full rounded-full transition-all ${hp < 25 ? "bg-rose-400" : hp < 55 ? "bg-amber-300" : "bg-emerald-300"}`,
					style: { width: `${hp}%` }
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-1 flex items-center justify-between font-mono-ui text-[10px] text-slate-300",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: trainer?.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					pokemon.hp,
					"/",
					pokemon.maxHp,
					" HP"
				] })]
			})
		]
	});
}
function TabButton({ active, onClick, icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: `battle-tab ${active ? "battle-tab-active" : ""}`,
		children: [icon, children]
	});
}
function BattleThumbnail({ pokemon, side = "foe", className = "", alt = "" }) {
	const sources = animatedPokemonUrls(pokemon, side);
	const [sourceIndex, setSourceIndex] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => setSourceIndex(0), [
		pokemon.id,
		pokemon.pokedexId,
		pokemon.name,
		pokemon.shiny,
		side
	]);
	const source = sources[Math.min(sourceIndex, sources.length - 1)] ?? "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		className,
		src: source,
		alt,
		loading: "lazy",
		decoding: "async",
		onError: (event) => {
			setSourceIndex((index) => {
				if (index < sources.length - 1) return index + 1;
				event.currentTarget.style.visibility = "hidden";
				return index;
			});
		}
	});
}
function SwitchButton({ pokemon, active, disabled, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		disabled,
		className: `battle-switch-button ${active ? "battle-switch-active" : ""} ${pokemon.hp <= 0 ? "battle-switch-fainted" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleThumbnail, {
			pokemon,
			className: "battle-switch-sprite",
			alt: ""
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate font-display text-sm font-bold",
				children: pokemon.displayName
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono-ui text-[9px] text-slate-400",
				children: pokemon.hp > 0 ? `${pokemon.hp}/${pokemon.maxHp} HP` : "FAINTED"
			})]
		})]
	});
}
function PartyDot({ pokemon, active }) {
	if (!pokemon) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "battle-party-dot battle-party-empty",
		"aria-label": "Empty party slot",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "＋" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `battle-party-dot ${active ? "battle-party-active" : ""} ${pokemon.hp <= 0 ? "battle-party-fainted" : ""}`,
		title: `${pokemon.displayName}: ${pokemon.hp}/${pokemon.maxHp} HP`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BattleThumbnail, {
			pokemon,
			className: "battle-party-sprite",
			alt: pokemon.displayName
		})
	});
}
function RoomState({ icon, text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "hof-panel battle-empty flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center",
		children: [icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "max-w-md text-sm text-slate-300",
			children: text
		})]
	});
}
//#endregion
export { BattleRoomPage as component };
