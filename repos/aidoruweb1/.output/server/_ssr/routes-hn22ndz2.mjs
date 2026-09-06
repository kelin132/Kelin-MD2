import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { m as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { B as FingerprintPattern, N as KeyRound, T as Menu, c as Swords, n as WalletCards, u as Sparkles, w as MessageCircle } from "../_libs/lucide-react.mjs";
import { $ as useSession, C as finishDiscordWebsiteLogin, H as sessionKey, Q as useServerFn, R as requestPasswordReset, k as phoneLogin, q as startDiscordWebsiteLogin, t as ConnectionNotice, tt as verifyPhone, z as resetPassword } from "./ConnectionNotice-PK1BS1rQ.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as motion } from "../_libs/motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-hn22ndz2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Portal() {
	const [mode, setMode] = (0, import_react.useState)("login");
	const [countryCode, setCountryCode] = (0, import_react.useState)("263");
	const [phoneNumber, setPhoneNumber] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [otp, setOtp] = (0, import_react.useState)("");
	const [verificationKind, setVerificationKind] = (0, import_react.useState)("login");
	const [notice, setNotice] = (0, import_react.useState)("");
	const [scrollY, setScrollY] = (0, import_react.useState)(0);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session, error: sessionError } = useSession();
	const doLogin = useServerFn(phoneLogin);
	const doRequestReset = useServerFn(requestPasswordReset);
	const doVerifyPhone = useServerFn(verifyPhone);
	const doResetPassword = useServerFn(resetPassword);
	const startDiscordLogin = useServerFn(startDiscordWebsiteLogin);
	const finishDiscordLogin = useServerFn(finishDiscordWebsiteLogin);
	const finishAuth = (0, import_react.useCallback)((user) => {
		queryClient.setQueryData(sessionKey, user);
		toast.success(`Welcome back, ${user.name}`);
		const destination = normalizeBattleDestination(new URLSearchParams(window.location.search).get("returnTo"));
		if (destination) window.location.assign(destination);
		else navigate({ to: "/dashboard" });
	}, [navigate, queryClient]);
	const submit = useMutation({
		mutationFn: async () => {
			if (!phoneNumber.trim()) throw new Error("Enter the phone number registered with the bot.");
			if (password.length < 8) throw new Error("Enter your website password.");
			return doLogin({ data: {
				countryCode,
				phoneNumber,
				password
			} });
		},
		onSuccess: (result) => {
			if (result.status === "verified") {
				finishAuth(result.user);
				return;
			}
			setVerificationKind("login");
			setNotice(`Open a private chat with the WhatsApp bot and send *.otp*. Then enter the six-digit code here. It expires at ${new Date(result.expiresAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			})}.`);
			setMode("verify");
		},
		onError: (error) => toast.error(error.message || "Unable to open your trainer world.")
	});
	const requestReset = useMutation({
		mutationFn: async () => {
			if (!phoneNumber.trim()) throw new Error("Enter the phone number registered with the bot.");
			if (newPassword.length < 8) throw new Error("Your new password must be at least 8 characters.");
			if (newPassword !== confirmPassword) throw new Error("Your passwords do not match.");
			return doRequestReset({ data: {
				countryCode,
				phoneNumber,
				password: newPassword
			} });
		},
		onSuccess: ({ expiresAt }) => {
			setNotice(`Open a private chat with the WhatsApp bot and send *.otp*. Then enter the six-digit code here. It expires at ${new Date(expiresAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			})}.`);
			setVerificationKind("reset");
			setMode("verify");
		},
		onError: (error) => toast.error(error.message || "Could not start password recovery.")
	});
	const verify = useMutation({
		mutationFn: () => verificationKind === "login" ? doVerifyPhone({ data: {
			countryCode,
			phoneNumber,
			code: otp
		} }) : doResetPassword({ data: {
			countryCode,
			phoneNumber,
			code: otp
		} }),
		onSuccess: finishAuth,
		onError: (error) => toast.error(error.message || "That code could not be verified.")
	});
	const discordLogin = useMutation({
		mutationFn: async () => {
			const { authorizationUrl } = await startDiscordLogin({});
			window.location.assign(authorizationUrl);
		},
		onError: (error) => toast.error(error.message || "Could not start Discord sign-in.")
	});
	(0, import_react.useEffect)(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("discord") !== "login") return;
		const code = params.get("code");
		const state = params.get("state");
		if (!code || !state) {
			const error = params.get("error");
			window.history.replaceState({}, "", window.location.pathname);
			if (error) toast.error("Discord sign-in was cancelled.");
			return;
		}
		finishDiscordLogin({ data: {
			code,
			state
		} }).then((user) => {
			window.history.replaceState({}, "", window.location.pathname);
			finishAuth(user);
		}).catch((error) => {
			window.history.replaceState({}, "", window.location.pathname);
			toast.error(error.message || "Discord sign-in failed.");
		});
	}, [finishAuth, finishDiscordLogin]);
	(0, import_react.useEffect)(() => {
		if (!session) return;
		const destination = normalizeBattleDestination(new URLSearchParams(window.location.search).get("returnTo"));
		if (destination) window.location.replace(destination);
		else navigate({
			to: "/dashboard",
			replace: true
		});
	}, [session, navigate]);
	(0, import_react.useEffect)(() => {
		const onScroll = () => setScrollY(window.scrollY);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	if (sessionError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionNotice, {
		error: sessionError,
		onRetry: () => window.location.reload()
	});
	const isBusy = submit.isPending || requestReset.isPending || verify.isPending || discordLogin.isPending;
	const isLogin = mode === "login";
	const isForgot = mode === "forgot";
	const isVerify = mode === "verify";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative min-h-screen overflow-hidden bg-[#04131b] text-white",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "landing-bg-bloom pointer-events-none absolute inset-0",
				style: { transform: `translate3d(0, ${Math.min(scrollY * .12, 70)}px, 0) scale(1.03)` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "landing-character-scene pointer-events-none absolute inset-x-0 bottom-0 h-[66vh]",
				style: { transform: `translate3d(0, ${Math.min(scrollY * .2, 110)}px, 0)` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "landing-bg-shade pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "landing-grid pointer-events-none absolute inset-0 opacity-60" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "landing-orb landing-orb-cyan pointer-events-none absolute -left-20 top-24 size-80 rounded-full blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "landing-orb landing-orb-rose pointer-events-none absolute right-[-10rem] top-[-6rem] size-[28rem] rounded-full blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "landing-leaves pointer-events-none absolute inset-0",
				"aria-hidden": "true",
				children: Array.from({ length: 16 }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `landing-leaf landing-leaf-${index + 1}` }, index))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Open menu",
				className: "landing-menu absolute left-6 top-6 z-20 grid size-14 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl sm:left-10 sm:top-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-7" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 pb-10 pt-24 sm:px-10 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:px-14 lg:py-14",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.section, {
					initial: {
						opacity: 0,
						y: 18
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { duration: .65 },
					className: "relative z-10 text-center lg:text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "landing-title mt-0",
							children: [
								"WELCOME TO",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-cyan-300",
									children: "AIDORU"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "landing-copy mx-auto mt-6 max-w-xl lg:mx-0",
							children: "The anime-powered home for your bot life. Raise your Pokémon, build your party, spend your coins, and meet your community in one glowing trainer world."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-8 flex flex-wrap justify-center gap-3 lg:justify-start",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
									icon: Sparkles,
									label: "Your Journey",
									copy: "Live party and Pokémon progress"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
									icon: WalletCards,
									label: "Your Economy",
									copy: "Shop, wallet and rewards"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Feature, {
									icon: Swords,
									label: "Your Arcade",
									copy: "Virtual-coin games and bets"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.section, {
					initial: {
						opacity: 0,
						scale: .97
					},
					animate: {
						opacity: 1,
						scale: 1
					},
					transition: {
						duration: .65,
						delay: .08
					},
					className: "relative z-10 lg:justify-self-end lg:w-full lg:max-w-[32rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "landing-login-card rounded-[2rem] border border-white/15 p-6 shadow-2xl sm:p-9",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-7",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "landing-kicker",
										children: "AIDORU TRAINER PORTAL"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "mt-2 font-display text-3xl font-bold tracking-tight",
										children: isLogin ? "Open your world" : isForgot ? "Recover your world" : "Check your signal"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-sm leading-relaxed text-slate-300",
										children: isLogin ? "Use the phone number already registered with the WhatsApp bot. Your existing trainer progress stays attached." : isForgot ? "Choose a new website password, then confirm the code from your private bot chat." : "Your code is tied to the phone number you entered. It can only be used once."
									})
								]
							}),
							notice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-4 flex gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs leading-relaxed text-cyan-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "mt-0.5 size-4 shrink-0 text-cyan-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: notice })]
							}),
							isLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: (event) => {
									event.preventDefault();
									submit.mutate();
								},
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-[7rem_1fr] gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											icon: MessageCircle,
											label: "COUNTRY",
											value: countryCode,
											onChange: (value) => setCountryCode(value.replace(/\D/g, "").slice(0, 4)),
											placeholder: "263",
											inputMode: "numeric",
											autoComplete: "tel-country-code"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											icon: FingerprintPattern,
											label: "PHONE NUMBER",
											value: phoneNumber,
											onChange: (value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 14)),
											placeholder: "771234567",
											inputMode: "numeric",
											autoComplete: "tel-national"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										icon: KeyRound,
										label: "WEBSITE PASSWORD",
										value: password,
										onChange: setPassword,
										placeholder: "Your website password",
										type: "password",
										autoComplete: "current-password"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: isBusy,
										className: "landing-button mt-3 w-full",
										children: submit.isPending ? "OPENING WORLD…" : "OPEN TRAINER WORLD"
									})
								]
							}),
							isLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "my-5 flex items-center gap-3 text-[10px] font-bold tracking-[0.22em] text-slate-500",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-white/10" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "OR" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-white/10" })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: isBusy,
									className: "landing-discord-button w-full",
									onClick: () => discordLogin.mutate(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiscordMark, {}), discordLogin.isPending ? "OPENING DISCORD…" : "CONTINUE WITH DISCORD"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-center text-[11px] leading-relaxed text-slate-400",
									children: "Already linked your WhatsApp trainer? Discord sign-in opens that same account."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-5 border-t border-white/10 pt-5 text-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold tracking-[0.16em] text-slate-300",
										children: "NEW TO AIDORU?"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "mt-2 text-sm font-semibold text-cyan-300 transition hover:text-white",
										onClick: () => setNotice("Start in WhatsApp: send .register <your_name> to the bot, then return here and sign in with your phone number."),
										children: "CREATE AN ACCOUNT"
									})]
								})
							] }),
							isForgot && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: (event) => {
									event.preventDefault();
									requestReset.mutate();
								},
								className: "space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-[7rem_1fr] gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											icon: MessageCircle,
											label: "COUNTRY",
											value: countryCode,
											onChange: (value) => setCountryCode(value.replace(/\D/g, "").slice(0, 4)),
											placeholder: "263",
											inputMode: "numeric",
											autoComplete: "tel-country-code"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
											icon: FingerprintPattern,
											label: "PHONE NUMBER",
											value: phoneNumber,
											onChange: (value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 14)),
											placeholder: "771234567",
											inputMode: "numeric",
											autoComplete: "tel-national"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										icon: KeyRound,
										label: "NEW WEBSITE PASSWORD",
										value: newPassword,
										onChange: setNewPassword,
										placeholder: "At least 8 characters",
										type: "password",
										autoComplete: "new-password"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
										icon: KeyRound,
										label: "CONFIRM PASSWORD",
										value: confirmPassword,
										onChange: setConfirmPassword,
										placeholder: "Repeat your password",
										type: "password",
										autoComplete: "new-password"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: isBusy,
										className: "landing-button mt-3 w-full",
										children: requestReset.isPending ? "PREPARING RECOVERY…" : "CONTINUE TO WHATSAPP"
									})
								]
							}),
							isVerify && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: (event) => {
									event.preventDefault();
									verify.mutate();
								},
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									icon: MessageCircle,
									label: "SIX-DIGIT OTP",
									value: otp,
									onChange: (value) => setOtp(value.replace(/\D/g, "").slice(0, 6)),
									placeholder: "000000",
									inputMode: "numeric",
									autoComplete: "one-time-code"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: isBusy,
									className: "landing-button mt-3 w-full",
									children: verify.isPending ? "VERIFYING CODE…" : "VERIFY OTP"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[11px] text-slate-400",
								children: [isLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-cyan-300 transition hover:text-white",
									onClick: () => {
										setNotice("");
										setMode("forgot");
									},
									children: "Forgot password?"
								}), !isLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "text-cyan-300 transition hover:text-white",
									onClick: () => {
										setNotice("");
										setMode("login");
									},
									children: "Back to sign in"
								})]
							}),
							isLogin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-4 text-center text-[11px] leading-relaxed text-slate-400",
								children: [
									"Use the same phone number you use with the WhatsApp bot. New accounts and password recovery are verified with ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-cyan-300",
										children: ".otp"
									}),
									" in a private bot chat."
								]
							})
						]
					})
				})]
			})
		]
	});
}
function normalizeBattleDestination(value) {
	if (!value || !value.startsWith("/battle")) return null;
	const [path = "", query = ""] = value.split("?", 2);
	if (path.startsWith("/battle/")) return path;
	if (path !== "/battle") return null;
	const params = new URLSearchParams(query);
	const reference = params.get("room") || params.get("code");
	return reference ? `/battle/${encodeURIComponent(reference)}` : "/battle";
}
function DiscordMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		className: "size-5 fill-current",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.54 5.01A16.1 16.1 0 0 0 15.56 3.8l-.49 1a14.7 14.7 0 0 0-6.14 0l-.49-1c-1.4.24-2.73.65-3.98 1.21C1.94 8.8 1.26 12.5 1.6 16.14a16.2 16.2 0 0 0 4.9 2.46l1.19-1.63c-.65-.24-1.27-.54-1.86-.9l.45-.35c3.58 1.68 7.46 1.68 11 0l.46.35c-.6.36-1.22.67-1.87.9l1.19 1.63a16.2 16.2 0 0 0 4.9-2.46c.4-4.3-.69-7.96-2.42-11.13ZM8.93 14.1c-1.06 0-1.93-.98-1.93-2.18s.85-2.18 1.93-2.18 1.94.98 1.93 2.18c0 1.2-.85 2.18-1.93 2.18Zm6.14 0c-1.06 0-1.93-.98-1.93-2.18s.85-2.18 1.93-2.18 1.94.98 1.93 2.18c0 1.2-.85 2.18-1.93 2.18Z" })
	});
}
function Feature({ icon: Icon, label, copy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "landing-feature flex min-w-[13rem] flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-left backdrop-blur-xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid size-9 shrink-0 place-items-center rounded-full bg-cyan-300 text-[#04202b]",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
			className: "block text-sm text-white",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
			className: "mt-0.5 block text-xs text-slate-400",
			children: copy
		})] })]
	});
}
function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", autoComplete, inputMode }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "landing-kicker mb-2 block",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "landing-input flex items-center gap-3 rounded-full border border-white/15 px-4 py-3.5 transition focus-within:border-cyan-300/70",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4 shrink-0 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value,
				onChange: (event) => onChange(event.target.value),
				placeholder,
				type,
				autoComplete,
				inputMode,
				className: "w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
			})]
		})]
	});
}
//#endregion
export { Portal as component };
